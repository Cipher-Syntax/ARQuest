/**
 * Strict JSON schema and correlation IDs for React-Native <-> Three.js/WebView communication.
 */

// A reusable script to be injected into WebViews
export const INJECTED_BRIDGE_SCRIPT = `
  window.ARBridge = {
    _correlationCounter: 0,
    
    // Web -> RN (Sending messages from HTML to React Native)
    sendMessage: function(type, payload = {}) {
      this._correlationCounter++;
      const messageId = 'web_req_' + Date.now() + '_' + this._correlationCounter;
      
      const message = {
        type: type,
        payload: payload,
        correlationId: messageId,
        timestamp: Date.now(),
        source: 'WEBVIEW'
      };
      
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      } else {
        console.warn('ReactNativeWebView not available. Message ignored:', message);
      }
      return messageId;
    }
  };
  true; // Note: injected script must evaluate to a truthy value or string
`;

// Helper for React Native to send messages to Web
export const createBridgeMessage = (type, payload = {}, correlationId = null) => {
  return JSON.stringify({
    type,
    payload,
    correlationId: correlationId || \`rn_req_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
    timestamp: Date.now(),
    source: 'REACT_NATIVE'
  });
};

// Helper for React Native to parse incoming messages
export const parseBridgeMessage = (rawString) => {
  try {
    const data = JSON.parse(rawString);
    
    // Handle legacy unstructured messages gracefully during transition
    if (data.type && !data.correlationId) {
      return { 
        success: true, 
        data: {
          type: data.type,
          payload: data, // Legacy puts everything at top-level
          correlationId: 'legacy_msg_' + Date.now(),
          source: 'WEBVIEW'
        },
        isLegacy: true
      };
    }
    
    // Ensure strict schema
    if (!data.type || !data.correlationId || data.source !== 'WEBVIEW') {
      throw new Error("Invalid bridge message schema");
    }
    
    return { success: true, data, isLegacy: false };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
