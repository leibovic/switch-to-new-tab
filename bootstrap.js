const { classes: Cc, interfaces: Ci, utils: Cu } = Components;

Cu.import("resource://gre/modules/Services.jsm");

var name = Services.strings.createBundle("chrome://browser/locale/browser.properties").GetStringFromName("contextmenu.openInNewTab");

function loadIntoWindow(window) {
  function newCallback(aTarget) {
    let url = window.NativeWindow.contextmenus._getLinkURL(aTarget);
    window.BrowserApp.addTab(url, { selected: true, parentId: window.BrowserApp.selectedTab.id });
  };

  let items = window.NativeWindow.contextmenus.items;
  for (let itemId of Object.keys(items)) {
    let item = items[itemId];
    if (item.name === name) {
      // XXX: item.callback is undefined here, so saving the original callback isn't working :(
      item.callback = newCallback;
      break;
    }
  }
}

function unloadFromWindow(window) {
  // XXX: Find a way to actually save the original callback, instead of copying the logic here
  function originalCallback(aTarget) {
    let url = window.NativeWindow.contextmenus._getLinkURL(aTarget);
    window.BrowserApp.addTab(url, { selected: false, parentId: window.BrowserApp.selectedTab.id });
  };

  let items = window.NativeWindow.contextmenus.items;
  for (let itemId of Object.keys(items)) {
    let item = items[itemId];
    if (item.name === name) {
      item.callback = originalCallback;
      break;
    }
  }
}

/**
 * bootstrap.js API
 */
var windowListener = {
  onOpenWindow: function(aWindow) {
    // Wait for the window to finish loading
    let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
    domWindow.addEventListener("load", function() {
      domWindow.removeEventListener("load", arguments.callee, false);
      loadIntoWindow(domWindow);
    }, false);
  },
  
  onCloseWindow: function(aWindow) {
  },
  
  onWindowTitleChange: function(aWindow, aTitle) {
  }
};

function startup(aData, aReason) {
  // Load into any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    loadIntoWindow(domWindow);
  }

  // Load into any new windows
  Services.wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
  // When the application is shutting down we normally don't have to clean
  // up any UI changes made
  if (aReason == APP_SHUTDOWN)
    return;

  // Stop listening for new windows
  Services.wm.removeListener(windowListener);

  // Unload from any existing windows
  let windows = Services.wm.getEnumerator("navigator:browser");
  while (windows.hasMoreElements()) {
    let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
    unloadFromWindow(domWindow);
  }
}

function install(aData, aReason) {
}

function uninstall(aData, aReason) {
}
