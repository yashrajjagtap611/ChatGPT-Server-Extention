// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Handle messages from popup/options pages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'SET_COOKIES') {
    setCookies(request.cookies)
      .then(result => sendResponse({ success: true, message: 'Cookies set successfully' }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  } else if (request.type === 'TEST_COOKIE') {
    testSingleCookie(request.cookie)
      .then(result => sendResponse({ success: true, message: 'Cookie test successful' }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Function to test a single cookie
async function testSingleCookie(cookie) {
  try {
    console.log('Testing single cookie:', cookie.name, 'domain:', cookie.domain, 'path:', cookie.path);
    
    // Determine the correct URL based on the cookie domain
    let url;
    if (cookie.domain && cookie.domain.includes('chatgpt.com')) {
      url = 'https://chatgpt.com';
    } else if (cookie.domain && cookie.domain.includes('openai.com')) {
      // Handle different openai.com paths
      if (cookie.path && cookie.path.includes('/index/openai-api/')) {
        url = 'https://openai.com/index/openai-api/';
      } else if (cookie.path && cookie.path.includes('/api/')) {
        url = 'https://api.openai.com/';
      } else {
        url = 'https://openai.com';
      }
    } else {
      url = 'https://chatgpt.com';
    }
    
    console.log(`Cookie ${cookie.name} will be tested for URL: ${url}`);

    // Handle domain properly for different cookie types
    let domain = cookie.domain;
    let path = cookie.path || '/';
    
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
    } else {
      expirationDate = undefined; // Session cookie
    }

    const cookieData = {
      url: url,
      name: cookie.name,
      value: cookie.value,
      domain: domain,
      path: path,
      secure: cookie.secure !== false,
      httpOnly: cookie.httpOnly !== false,
      sameSite: cookie.sameSite || 'Lax',
      expirationDate: expirationDate
    };
    
    console.log('Testing cookie with data:', cookieData);
    
    await chrome.cookies.set(cookieData);
    console.log(`Successfully tested cookie: ${cookie.name}`);
    
    return true;
  } catch (error) {
    console.error(`Error testing cookie ${cookie.name}:`, error);
    throw error;
  }
}

// Function to set cookies
async function setCookies(cookies) {
  console.log('Starting to set cookies:', cookies.length, 'cookies');
  
  for (const cookie of cookies) {
    try {
      console.log('Processing cookie:', cookie.name, 'domain:', cookie.domain, 'path:', cookie.path);
      
      // Determine the correct URL based on the cookie domain
      let url;
      if (cookie.domain && cookie.domain.includes('chatgpt.com')) {
        url = 'https://chatgpt.com';
      } else if (cookie.domain && cookie.domain.includes('openai.com')) {
        // Handle different openai.com paths
        if (cookie.path && cookie.path.includes('/index/openai-api/')) {
          url = 'https://openai.com/index/openai-api/';
        } else if (cookie.path && cookie.path.includes('/api/')) {
          url = 'https://api.openai.com/';
        } else {
          url = 'https://openai.com';
        }
      } else {
        // Default fallback
        url = 'https://chatgpt.com';
      }
      
      console.log(`Cookie ${cookie.name} will be set for URL: ${url}`);
      
      // Handle domain properly for different cookie types
      let domain = cookie.domain;
      let path = cookie.path || '/';
      
      // Special handling for __Host- and __Secure- prefixed cookies
      if (cookie.name.startsWith('__Host-')) {
        // __Host- cookies must have domain=undefined, path=/, and secure=true
        domain = undefined;
        path = '/';
        if (!cookie.secure) {
          console.warn(`Cookie ${cookie.name} is __Host- prefixed but not secure, forcing secure=true`);
        }
      } else if (cookie.name.startsWith('__Secure-')) {
        // __Secure- cookies must have secure=true
        if (!cookie.secure) {
          console.warn(`Cookie ${cookie.name} is __Secure- prefixed but not secure, forcing secure=true`);
        }
      } else if (domain && domain.startsWith('.')) {
        // Remove leading dot for regular cookies
        domain = domain.substring(1);
      }

      // Handle expiry date properly
      let expirationDate;
      if (cookie.expiry) {
        if (typeof cookie.expiry === 'number') {
          // If it's already a timestamp, use it directly
          expirationDate = cookie.expiry;
        } else if (cookie.expiry === null) {
          // Session cookie (no expiry)
          expirationDate = undefined;
        } else {
          // Try to parse as date string or convert to timestamp
          try {
            expirationDate = new Date(cookie.expiry).getTime() / 1000;
          } catch (e) {
            console.warn(`Could not parse expiry for ${cookie.name}, using default`);
            expirationDate = (Date.now() / 1000) + 86400 * 365; // 1 year from now
          }
        }
      } else {
        // Default expiry: 1 year from now
        expirationDate = (Date.now() / 1000) + 86400 * 365;
      }

      const cookieData = {
        url: url,
        name: cookie.name,
        value: cookie.value,
        domain: domain, // undefined for __Host- cookies
        path: path,
        secure: cookie.secure !== false,
        httpOnly: cookie.httpOnly !== false,
        sameSite: cookie.sameSite || 'Lax',
        expirationDate: expirationDate
      };
      
      console.log('Setting cookie with data:', cookieData);
      
      await chrome.cookies.set(cookieData);
      
      console.log(`Successfully set cookie: ${cookie.name} for domain: ${domain || 'no domain (__Host-)'}`);
    } catch (error) {
      console.error(`Error setting cookie ${cookie.name}:`, error);
      
      // Try alternative approach for problematic cookies
      if (error.message.includes('__Host-') || error.message.includes('__Secure-')) {
        console.log(`Trying alternative approach for ${cookie.name}...`);
        try {
          const fallbackData = {
            url: url,
            name: cookie.name,
            value: cookie.value,
            path: '/',
            secure: true,
            httpOnly: cookie.httpOnly !== false,
            sameSite: cookie.sameSite || 'Lax',
            expirationDate: expirationDate
          };
          
          // For __Host- cookies, don't set domain
          if (!cookie.name.startsWith('__Host-')) {
            fallbackData.domain = domain;
          }
          
          await chrome.cookies.set(fallbackData);
          console.log(`Successfully set cookie ${cookie.name} with fallback method`);
        } catch (fallbackError) {
          console.error(`Fallback method also failed for ${cookie.name}:`, fallbackError);
          throw error; // Throw original error
        }
      } else {
        throw error;
      }
    }
  }
  
  console.log('Finished setting all cookies');
}

// Fallback: if popup fails to load, open options page
chrome.action.onClicked.addListener(() => {
  if (chrome.runtime.openOptionsPage) {
    chrome.runtime.openOptionsPage();
  }
});


