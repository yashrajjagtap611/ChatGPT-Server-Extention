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
  
  // Login handler
  document.getElementById('login-btn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch(`${serverUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      if (response.ok) {
        chrome.storage.local.set({
          token: data.token,
          userInfo: data.user
        }, () => {
          showLoggedInView(data.user);
        });
        loginStatus.textContent = 'Login successful!';
        loginStatus.className = 'status success';
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error) {
      loginStatus.textContent = error.message;
      loginStatus.className = 'status error';
    }
  });

  // Insert Cookies handler (for users)
  document.getElementById('insert-cookies').addEventListener('click', async () => {
    try {
      const token = await getStoredToken();
      const response = await fetch(`${serverUrl}/api/cookies/get`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch cookies');
      
      const cookies = await response.json();
      console.log('Fetched cookies:', cookies);
      
      if (!cookies || cookies.length === 0) {
        showStatus('No cookies available to insert', 'error');
        return;
      }
      
      showStatus(`Attempting to insert ${cookies.length} cookies...`, 'info');
      
      const result = await chrome.runtime.sendMessage({ type: 'SET_COOKIES', cookies });
      console.log('Cookie insertion result:', result);
      
      if (result && result.success) {
        showStatus('Cookies inserted successfully!', 'success');
      } else {
        throw new Error(result?.error || 'Failed to insert cookies');
      }
    } catch (error) {
      console.error('Error inserting cookies:', error);
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
      
      const cookies = await response.json();
      if (!cookies || !cookies.length) {
        showStatus('No cookies available to test', 'error');
        return;
      }

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
      
      const cookies = await response.json();
      if (!cookies || !cookies.length) {
        showStatus('No cookies available to test', 'error');
        return;
      }

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
      chrome.storage.local.remove(['token', 'userInfo'], () => {
        loginForm.style.display = 'block';
        afterLogin.style.display = 'none';
        userView.style.display = 'none';
        adminView.style.display = 'none';
        createUserForm.style.display = 'none';
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

  // Check login status on page load
  chrome.storage.local.get(['token', 'userInfo'], function(result) {
    if (result.token && result.userInfo) {
      showLoggedInView(result.userInfo);
    }
  });
});




