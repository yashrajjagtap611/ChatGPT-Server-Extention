// Helper function to handle API responses
async function handleApiResponse(response) {
  try {
    // First check if the response is actually JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server did not return JSON');
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    if (error.name === 'SyntaxError') {
      console.error('JSON Parse Error:', error);
      throw new Error('Invalid JSON response from server');
    }
    throw error;
  }
}

  // Test server connectivity
  async function testServerConnection() {
    const serverUrl = 'http://localhost:3000';
  
  try {
    console.log('🧪 Testing server connection...');
    showStatus('Testing server connection...', 'info');
    
    // Test basic connectivity
    const healthResponse = await fetch(`${serverUrl}/api/health`);
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', healthData);
    
    // Test Chrome extension specific endpoint
    const testResponse = await fetch(`${serverUrl}/api/test-extension`);
    if (!testResponse.ok) {
      throw new Error(`Extension test failed: ${testResponse.status}`);
    }
    const testData = await testResponse.json();
    console.log('✅ Extension test passed:', testData);
    
    showStatus('Server connection successful!', 'success');
    return true;
    
  } catch (error) {
    console.error('❌ Server connection test failed:', error);
    showStatus(`Connection test failed: ${error.message}`, 'error');
    return false;
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const serverUrl = 'http://localhost:3000';
  
  // Cache DOM elements
  const loginForm = document.getElementById('login-form');
  const afterLogin = document.getElementById('after-login');
  const userView = document.getElementById('user-view');
  const adminView = document.getElementById('admin-view');
  const createUserForm = document.getElementById('create-user-form');
  const loginStatus = document.getElementById('login-status');
  const userInfo = document.getElementById('user-info');
  
  // Test connection on page load
  testServerConnection();
  
  // Login handler
  document.getElementById('login-btn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
      showStatus('Please enter both username and password', 'error');
      return;
    }

    try {
      showStatus('Connecting to server...', 'info');
      
      console.log('Attempting to connect to:', serverUrl);
      
      const response = await fetch(`${serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        
        // Handle specific error messages
        if (errorData.message && (errorData.message.includes('expired') || errorData.message.includes('inactive'))) {
          throw new Error(errorData.message);
        }
        
        throw new Error(`Server error (${response.status}): ${errorData.message || 'Login failed'}`);
      }

      const data = await response.json();
      console.log('Login successful:', data);
      
      chrome.storage.local.set({
        token: data.token,
        userInfo: data.user,
        sessionData: JSON.stringify({
          token: data.token,
          expiresAt: data.expiresAt,
          user: data.user
        })
      }, () => {
        showLoggedInView(data.user);
      });
      
      showStatus('Login successful!', 'success');
      
    } catch (error) {
      console.error('Login error details:', error);
      
      let errorMessage = 'Login failed';
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = `Cannot connect to server at ${serverUrl}. Please check:\n` +
                      '1. Server is running\n' +
                      '2. Server port is correct\n' +
                      '3. No firewall blocking connection';
      } else if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
        errorMessage = 'Network error. Check your internet connection.';
      } else if (error.message.includes('Server error')) {
        errorMessage = error.message;
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      showStatus(errorMessage, 'error');
      loginStatus.textContent = errorMessage;
      loginStatus.className = 'status error';
    }
  });

  // Insert Cookies handler (for users)
  document.getElementById('insert-cookies').addEventListener('click', async () => {
    try {
      const token = await getStoredToken();
      if (!token) {
        showStatus('Not logged in. Please log in first.', 'error');
        return;
      }

      // Get current tab to determine website
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      if (!currentTab || !currentTab.url) {
        showStatus('Cannot determine current website', 'error');
        return;
      }

      const url = new URL(currentTab.url);
      const website = url.hostname;
      
      // Check website access first
      showStatus('Checking website access...', 'info');
      
      const accessResponse = await fetch(`${serverUrl}/api/users/check-access/${encodeURIComponent(website)}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const accessData = await accessResponse.json();
      if (!accessData.hasAccess) {
        showStatus(accessData.message || 'Access denied to this website', 'error');
        return;
      }

      showStatus('Fetching cookies...', 'info');
      
      const response = await fetch(`${serverUrl}/api/cookies/get?website=${encodeURIComponent(website)}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await handleApiResponse(response);
      console.log('Server response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch cookies');
      }
      
      if (!data.cookies || data.cookies.length === 0) {
        showStatus('No cookies available for this website', 'info');
        return;
      }
      
      showStatus(`Attempting to insert ${data.cookies.length} cookies for ${website}...`, 'info');
      
      const result = await chrome.runtime.sendMessage({ 
        type: 'SET_COOKIES', 
        cookies: data.cookies,
        website: website
      });
      console.log('Cookie insertion result:', result);
      
      if (result && result.success) {
        showStatus('Cookies inserted successfully!', 'success');
        
        // Track successful insertion
        await fetch(`${serverUrl}/api/cookies/insert`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ website, cookies: data.cookies })
        });
      } else {
        throw new Error(result?.error || 'Failed to insert cookies');
      }
    } catch (error) {
      console.error('Error inserting cookies:', error);
      
      // Handle session expiry
      if (error.message.includes('Token expired') || error.message.includes('Session expired')) {
        showStatus('Session expired. Please log in again.', 'error');
        chrome.storage.local.remove(['token', 'userInfo']);
        setTimeout(() => window.location.reload(), 2000);
        return;
      }
      
      showStatus(`Error: ${error.message}`, 'error');
    }
  });

  // Admin: Cookie Management
  document.getElementById('upload-cookies').addEventListener('click', () => {
    document.getElementById('cookie-file').click();
  });

  document.getElementById('cookie-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const cookies = JSON.parse(e.target.result);
          const token = await getStoredToken();
          
          const response = await fetch(`${serverUrl}/api/cookies/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ cookies })
          });

          if (!response.ok) throw new Error('Failed to upload cookies');
          showStatus('Cookies uploaded successfully', 'success');
        } catch (error) {
          showStatus(`Error parsing cookies: ${error.message}`, 'error');
        }
      };
      reader.readAsText(file);
    } catch (error) {
      showStatus(error.message, 'error');
    }
  });

  document.getElementById('view-cookies').addEventListener('click', async () => {
    try {
      const token = await getStoredToken();
      const response = await fetch(`${serverUrl}/api/cookies`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch cookies');
      
      const bundles = await response.json();
      if (!bundles.length) {
        showStatus('No cookie bundles available', 'info');
        return;
      }

      const cookieInfo = document.createElement('div');
      cookieInfo.className = 'cookie-info';
      cookieInfo.textContent = `Latest bundle: ${bundles[0].cookies.length} cookies (${new Date(bundles[0].uploadedAt).toLocaleString()})`;
      document.body.appendChild(cookieInfo);
      setTimeout(() => cookieInfo.remove(), 5000);
    } catch (error) {
      showStatus(error.message, 'error');
    }
  });

  // Admin: User Management
  document.getElementById('view-users').addEventListener('click', async () => {
    try {
      const token = await getStoredToken();
      const response = await fetch(`${serverUrl}/api/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch users');
      
      const users = await response.json();
      
      const userList = document.createElement('div');
      userList.className = 'user-list';
      
      users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        userItem.innerHTML = `
          <span>${user.username} ${user.isAdmin ? '(Admin)' : ''}</span>
          <span>${new Date(user.createdAt).toLocaleDateString()}</span>
        `;
        userList.appendChild(userItem);
      });

      document.body.appendChild(userList);
      setTimeout(() => userList.remove(), 5000);
    } catch (error) {
      showStatus(error.message, 'error');
    }
  });

  document.getElementById('create-user').addEventListener('click', () => {
    adminView.style.display = 'none';
    createUserForm.style.display = 'block';
  });

  // Admin: Test Cookies
  document.getElementById('test-cookies').addEventListener('click', async () => {
    try {
      const token = await getStoredToken();
      const response = await fetch(`${serverUrl}/api/cookies/get`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch cookies');
      
      const responseData = await response.json();
      if (!responseData.success || !responseData.cookies || !responseData.cookies.length) {
        showStatus('No cookies available to test', 'error');
        return;
      }

      const cookies = responseData.cookies;
      showStatus(`Testing ${cookies.length} cookies individually...`, 'info');
      
      let successCount = 0;
      let failCount = 0;
      const errors = [];
      
      // Test each cookie individually
      for (let i = 0; i < cookies.length; i++) {
        try {
          const result = await chrome.runtime.sendMessage({ 
            type: 'TEST_COOKIE', 
            cookie: cookies[i]
          });
          
          if (result && result.success) {
            successCount++;
            console.log(`Cookie ${i + 1}/${cookies.length}: ${cookies[i].name} - SUCCESS`);
          } else {
            failCount++;
            const error = result?.error || 'Unknown error';
            errors.push(`${cookies[i].name}: ${error}`);
            console.error(`Cookie ${i + 1}/${cookies.length}: ${cookies[i].name} - FAILED: ${error}`);
          }
        } catch (error) {
          failCount++;
          errors.push(`${cookies[i].name}: ${error.message}`);
          console.error(`Cookie ${i + 1}/${cookies.length}: ${cookies[i].name} - ERROR: ${error.message}`);
        }
      }
      
      // Show results
      if (failCount === 0) {
        showStatus(`All ${successCount} cookies tested successfully!`, 'success');
      } else {
        const message = `${successCount} cookies succeeded, ${failCount} failed`;
        showStatus(message, 'error');
        
        // Show detailed errors
        const errorInfo = document.createElement('div');
        errorInfo.className = 'cookie-info';
        errorInfo.innerHTML = `
          <h4>Cookie Test Results:</h4>
          <p><strong>Success:</strong> ${successCount}</p>
          <p><strong>Failed:</strong> ${failCount}</p>
          <h5>Failed Cookies:</h5>
          <ul>
            ${errors.map(e => `<li>${e}</li>`).join('')}
          </ul>
        `;
        
        document.body.appendChild(errorInfo);
        setTimeout(() => errorInfo.remove(), 10000);
      }
    } catch (error) {
      showStatus(`Cookie test failed: ${error.message}`, 'error');
    }
  });

  // Test Problematic Cookies handler
  document.getElementById('test-problematic').addEventListener('click', async () => {
    try {
      const token = await getStoredToken();
      const response = await fetch(`${serverUrl}/api/cookies/get`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch cookies');
      
      const responseData = await response.json();
      if (!responseData.success || !responseData.cookies || !responseData.cookies.length) {
        showStatus('No cookies available to test', 'error');
        return;
      }

      const cookies = responseData.cookies;

      // Filter for problematic cookies
      const problematicCookies = cookies.filter(cookie => 
        cookie.name.startsWith('__Host-') || 
        cookie.name.startsWith('__Secure-') ||
        cookie.name.includes('csrf') ||
        cookie.name.includes('auth') ||
        cookie.name.includes('session') ||
        cookie.name.includes('token')
      );

      if (problematicCookies.length === 0) {
        showStatus('No problematic cookies found', 'info');
        return;
      }

      showStatus(`Testing ${problematicCookies.length} problematic cookies...`, 'info');
      
      let successCount = 0;
      let failCount = 0;
      const errors = [];
      
      // Test each problematic cookie individually
      for (let i = 0; i < problematicCookies.length; i++) {
        const cookie = problematicCookies[i];
        try {
          console.log(`Testing problematic cookie: ${cookie.name} (${cookie.name.startsWith('__Host-') ? '__Host-' : cookie.name.startsWith('__Secure-') ? '__Secure-' : 'other'})`);
          
          const result = await chrome.runtime.sendMessage({ 
            type: 'TEST_COOKIE', 
            cookie: cookie
          });
          
          if (result && result.success) {
            successCount++;
            console.log(`Problematic cookie ${i + 1}/${problematicCookies.length}: ${cookie.name} - SUCCESS`);
          } else {
            failCount++;
            const error = result?.error || 'Unknown error';
            errors.push(`${cookie.name}: ${error}`);
            console.error(`Problematic cookie ${i + 1}/${problematicCookies.length}: ${cookie.name} - FAILED: ${error}`);
          }
        } catch (error) {
          failCount++;
          errors.push(`${cookie.name}: ${error.message}`);
          console.error(`Problematic cookie ${i + 1}/${problematicCookies.length}: ${cookie.name} - ERROR: ${error.message}`);
        }
      }
      
      // Show results
      if (failCount === 0) {
        showStatus(`All ${successCount} problematic cookies tested successfully!`, 'success');
      } else {
        const message = `${successCount} problematic cookies succeeded, ${failCount} failed`;
        showStatus(message, 'error');
        
        // Show detailed errors
        const errorInfo = document.createElement('div');
        errorInfo.className = 'cookie-info';
        errorInfo.innerHTML = `
          <h4>Problematic Cookie Test Results:</h4>
          <p><strong>Success:</strong> ${successCount}</p>
          <p><strong>Failed:</strong> ${failCount}</p>
          <h5>Failed Cookies:</h5>
          <ul>
            ${errors.map(e => `<li>${e}</li>`).join('')}
          </ul>
        `;
        
        document.body.appendChild(errorInfo);
        setTimeout(() => errorInfo.remove(), 15000);
      }
    } catch (error) {
      showStatus(`Problematic cookie test failed: ${error.message}`, 'error');
    }
  });

  // Verify Cookies handler
  document.getElementById('verify-cookies').addEventListener('click', async () => {
    try {
      showStatus('Verifying cookies...', 'info');
      
      // Get cookies from multiple domains
      const chatgptCookies = await chrome.cookies.getAll({ domain: 'chatgpt.com' });
      const chatgptSecureCookies = await chrome.cookies.getAll({ domain: '.chatgpt.com' });
      const openaiCookies = await chrome.cookies.getAll({ domain: 'openai.com' });
      const openaiSecureCookies = await chrome.cookies.getAll({ domain: '.openai.com' });
      const apiOpenaiCookies = await chrome.cookies.getAll({ domain: 'api.openai.com' });
      
      const allCookies = [
        ...chatgptCookies, 
        ...chatgptSecureCookies, 
        ...openaiCookies, 
        ...openaiSecureCookies,
        ...apiOpenaiCookies
      ];
      
      if (allCookies.length === 0) {
        showStatus('No cookies found for chatgpt.com or openai.com', 'error');
        return;
      }
      
      // Group cookies by domain for better display
      const cookiesByDomain = {
        'chatgpt.com': [...chatgptCookies, ...chatgptSecureCookies],
        'openai.com': [...openaiCookies, ...openaiSecureCookies],
        'api.openai.com': apiOpenaiCookies
      };
      
      const cookieInfo = document.createElement('div');
      cookieInfo.className = 'cookie-info';
      
      let infoHTML = `<h4>Found ${allCookies.length} total cookies:</h4>`;
      
      Object.entries(cookiesByDomain).forEach(([domain, cookies]) => {
        if (cookies.length > 0) {
          infoHTML += `
            <h5>${domain} (${cookies.length} cookies):</h5>
            <ul>
              ${cookies.slice(0, 3).map(c => `<li>${c.name}: ${c.value.substring(0, 20)}...</li>`).join('')}
              ${cookies.length > 3 ? `<li>... and ${cookies.length - 3} more</li>` : ''}
            </ul>
          `;
        }
      });
      
      cookieInfo.innerHTML = infoHTML;
      
      document.body.appendChild(cookieInfo);
      setTimeout(() => cookieInfo.remove(), 10000);
      
      showStatus(`Found ${allCookies.length} cookies across all domains`, 'success');
    } catch (error) {
      console.error('Error verifying cookies:', error);
      showStatus(`Error verifying cookies: ${error.message}`, 'error');
    }
  });

  // Admin: Create User handler
  document.getElementById('save-user').addEventListener('click', async () => {
    const username = document.getElementById('new-username').value;
    const password = document.getElementById('new-password').value;

    try {
      const token = await getStoredToken();
      const response = await fetch(`${serverUrl}/api/auth/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok) {
        showStatus('User created successfully!', 'success');
        document.getElementById('new-username').value = '';
        document.getElementById('new-password').value = '';
      } else {
        throw new Error(data.message || 'Failed to create user');
      }
    } catch (error) {
      showStatus(error.message, 'error');
    }
  });

  // Back button handler
  document.getElementById('back-to-admin').addEventListener('click', () => {
    createUserForm.style.display = 'none';
    adminView.style.display = 'block';
  });

  // Logout handler
  document.querySelectorAll('#logout').forEach(button => {
    button.addEventListener('click', () => {
      chrome.storage.local.remove(['token', 'userInfo', 'sessionData'], () => {
        loginForm.style.display = 'block';
        afterLogin.style.display = 'none';
        userView.style.display = 'none';
        adminView.style.display = 'none';
        createUserForm.style.display = 'none';
        showStatus('Logged out successfully', 'success');
      });
    });
  });

  // Helper functions
  function showLoggedInView(userInfo) {
    loginForm.style.display = 'none';
    afterLogin.style.display = 'block';
    document.getElementById('user-info').textContent = `Welcome, ${userInfo.username}!`;

    if (userInfo.isAdmin) {
      adminView.style.display = 'block';
      userView.style.display = 'none';
    } else {
      userView.style.display = 'block';
      adminView.style.display = 'none';
    }
  }

  function showStatus(message, type) {
    const status = document.createElement('div');
    status.textContent = message;
    status.className = `status ${type}`;
    document.body.appendChild(status);
    setTimeout(() => status.remove(), 3000);
  }

  async function getStoredToken() {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['token'], function(result) {
        if (result.token) {
          resolve(result.token);
        } else {
          reject(new Error('Not logged in'));
        }
      });
    });
  }

  // Session management
  function checkSessionExpiry() {
    chrome.storage.local.get(['sessionData'], function(result) {
      if (!result.sessionData) {
        return;
      }
      
      try {
        const session = JSON.parse(result.sessionData);
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        
        if (now >= expiresAt) {
          showStatus('Session expired. Please log in again.', 'error');
          chrome.storage.local.remove(['token', 'userInfo', 'sessionData']);
          loginForm.style.display = 'block';
          afterLogin.style.display = 'none';
          return;
        }
        
        // Check if session expires soon (within 5 minutes)
        const fiveMinutes = 5 * 60 * 1000;
        if ((expiresAt.getTime() - now.getTime()) < fiveMinutes) {
          showSessionWarning(Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60)));
        }
      } catch (error) {
        console.error('Session check error:', error);
        chrome.storage.local.remove(['token', 'userInfo', 'sessionData']);
      }
    });
  }
  
  function showSessionWarning(minutesLeft) {
    const warning = document.createElement('div');
    warning.className = 'session-warning';
    warning.innerHTML = `
      <div class="warning-content">
        <span>Session expires in ${minutesLeft} minutes</span>
        <button id="extend-session">Extend Session</button>
        <button id="logout-now">Logout</button>
      </div>
    `;
    
    document.body.appendChild(warning);
    
    document.getElementById('extend-session').addEventListener('click', async () => {
      try {
        const token = await getStoredToken();
        const response = await fetch(`${serverUrl}/api/auth/refresh`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await handleApiResponse(response);
        
        chrome.storage.local.set({
          token: data.token,
          userInfo: data.user,
          sessionData: JSON.stringify({
            token: data.token,
            expiresAt: data.expiresAt,
            user: data.user
          })
        });
        
        warning.remove();
        showStatus('Session extended successfully!', 'success');
      } catch (error) {
        showStatus('Failed to extend session. Please log in again.', 'error');
        chrome.storage.local.remove(['token', 'userInfo', 'sessionData']);
        window.location.reload();
      }
    });
    
    document.getElementById('logout-now').addEventListener('click', () => {
      chrome.storage.local.remove(['token', 'userInfo', 'sessionData']);
      window.location.reload();
    });
    
    // Auto-remove warning after 30 seconds
    setTimeout(() => {
      if (warning.parentNode) {
        warning.remove();
      }
    }, 30000);
  }
  
  // Check session on page load and periodically
  checkSessionExpiry();
  setInterval(checkSessionExpiry, 60000); // Check every minute
  
  // Check login status on page load
  chrome.storage.local.get(['token', 'userInfo', 'sessionData'], function(result) {
    if (result.token && result.userInfo && result.sessionData) {
      try {
        const session = JSON.parse(result.sessionData);
        const now = new Date();
        const expiresAt = new Date(session.expiresAt);
        
        if (now < expiresAt) {
          showLoggedInView(result.userInfo);
        } else {
          chrome.storage.local.remove(['token', 'userInfo', 'sessionData']);
        }
      } catch (error) {
        chrome.storage.local.remove(['token', 'userInfo', 'sessionData']);
      }
    }
  });
});




