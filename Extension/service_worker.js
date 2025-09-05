// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('ChatGPT Cookie Importer Extension installed');
});

// Handle messages from popup/options pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request.type);
  
  if (request.type === 'SET_COOKIES') {
    setCookies(request.cookies, request.website)
      .then(result => {
        console.log('Cookies set result:', result);
        sendResponse(result);
      })
      .catch(error => {
        console.error('Error setting cookies:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }
  
  if (request.type === 'TEST_COOKIE') {
    testCookie(request.cookie)
      .then(result => {
        console.log('Cookie test result:', result);
        sendResponse({ success: true, message: 'Cookie test completed' });
      })
      .catch(error => {
        console.error('Error testing cookie:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Will respond asynchronously
  }
});

// Function to set cookies
async function setCookies(cookies, targetWebsite) {
  console.log('Starting to set cookies:', cookies.length, 'cookies', targetWebsite ? `for ${targetWebsite}` : '');
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  for (const cookie of cookies) {
    try {
      console.log('Processing cookie:', cookie.name);
      
      // Determine the correct URL based on target website or cookie domain
      let url = targetWebsite ? `https://${targetWebsite}` : 'https://chatgpt.com';
      if (!targetWebsite) {
        if (cookie.domain && cookie.domain.includes('openai.com')) {
          url = 'https://openai.com';
        } else if (cookie.domain && cookie.domain.includes('chatgpt.com')) {
          url = 'https://chatgpt.com';
        }
      }
      
      // Handle domain properly for different cookie types
      let domain = cookie.domain;
      let path = cookie.path || '/';
      
      // Special handling for __Host- prefixed cookies
      if (cookie.name.startsWith('__Host-')) {
        domain = undefined;
        path = '/';
      } else if (domain && domain.startsWith('.')) {
        domain = domain.substring(1);
      }

      // Handle expiry date
      let expirationDate;
      if (cookie.expiry && cookie.expiry !== null) {
        if (typeof cookie.expiry === 'number') {
          expirationDate = cookie.expiry;
        } else {
          try {
            expirationDate = new Date(cookie.expiry).getTime() / 1000;
          } catch (e) {
            expirationDate = (Date.now() / 1000) + 86400 * 365;
          }
        }
      }

      const cookieData = {
        url: url,
        name: cookie.name,
        value: cookie.value,
        domain: domain,
        path: path,
        secure: cookie.secure !== false,
        httpOnly: cookie.httpOnly !== false,
        sameSite: cookie.sameSite || 'Lax'
      };
      
      if (expirationDate) {
        cookieData.expirationDate = expirationDate;
      }
      
      console.log('Setting cookie:', cookieData);
      
      await chrome.cookies.set(cookieData);
      successCount++;
      console.log(`Successfully set cookie: ${cookie.name}`);
      
    } catch (error) {
      errorCount++;
      const errorMsg = `${cookie.name}: ${error.message}`;
      errors.push(errorMsg);
      console.error(`Error setting cookie ${cookie.name}:`, error);
    }
  }
  
  console.log(`Finished setting cookies. Success: ${successCount}, Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    console.error('Cookie errors:', errors);
  }
  
  return { 
    successCount, 
    errorCount, 
    errors,
    success: errorCount === 0,
    message: errorCount === 0 ? 
      `All ${successCount} cookies set successfully` : 
      `${successCount} cookies succeeded, ${errorCount} failed`
  };
}

// Function to test a single cookie
async function testCookie(cookie) {
  console.log('Testing cookie:', cookie.name);
  
  try {
    // Determine the correct URL based on the cookie domain
    let url = 'https://chatgpt.com';
    if (cookie.domain && cookie.domain.includes('openai.com')) {
      url = 'https://openai.com';
    }
    
    // Handle domain properly for different cookie types
    let domain = cookie.domain;
    let path = cookie.path || '/';
    
    // Special handling for __Host- prefixed cookies
    if (cookie.name.startsWith('__Host-')) {
      domain = undefined;
      path = '/';
    } else if (domain && domain.startsWith('.')) {
      domain = domain.substring(1);
    }

    // Handle expiry date
    let expirationDate;
    if (cookie.expiry && cookie.expiry !== null) {
      if (typeof cookie.expiry === 'number') {
        expirationDate = cookie.expiry;
      } else {
        try {
          expirationDate = new Date(cookie.expiry).getTime() / 1000;
        } catch (e) {
          expirationDate = (Date.now() / 1000) + 86400 * 365;
        }
      }
    }

    const cookieData = {
      url: url,
      name: cookie.name,
      value: cookie.value,
      domain: domain,
      path: path,
      secure: cookie.secure !== false,
      httpOnly: cookie.httpOnly !== false,
      sameSite: cookie.sameSite || 'Lax'
    };
    
    if (expirationDate) {
      cookieData.expirationDate = expirationDate;
    }
    
    console.log('Testing cookie with data:', cookieData);
    
    // Try to set the cookie
    await chrome.cookies.set(cookieData);
    
    // Verify the cookie was set
    const testUrl = `https://${domain || 'chatgpt.com'}${path}`;
    const verifyCookie = await chrome.cookies.get({ url: testUrl, name: cookie.name });
    
    if (verifyCookie) {
      console.log(`Cookie ${cookie.name} test successful`);
      return { success: true, message: `Cookie ${cookie.name} set and verified` };
    } else {
      throw new Error(`Cookie ${cookie.name} was not set properly`);
    }
    
  } catch (error) {
    console.error(`Error testing cookie ${cookie.name}:`, error);
    throw error;
  }
}

// Fallback: if popup fails to load, open options page
chrome.action.onClicked.addListener(() => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  }
});


