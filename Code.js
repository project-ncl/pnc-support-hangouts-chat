/**
 * Responds to a MESSAGE event in Hangouts Chat.
 *
 * @param {Object} event the event object from Hangouts Chat
 */
function onMessage(event) {
  
  var name = "";
  var message = "";

  if (event.space.type == "DM") {
    name = "You";
  } else {
    name = event.user.displayName;
  }
  
  if (event.message.text.includes("support add")) {
    
    var currentSupport = getSupportStoreString();
    
    if (currentSupport == null) {
      currentSupport = "";
    }
    
    currentSupport += " <" + event.user.name + ">";
    setSupportStoreString(currentSupport);
    
    message = "You were added to the support engineers list";
    
  } else if (event.message.text.includes("support reset")) {
    
    setSupportStoreString("");
    message = "Support engineer list reset";
    
  }
    
  if (message == "" && haveSupportEngineers()) {
    message = "Ping: " + getSupportStoreString();
  }
  
  return { "text": message };
}



/**
 * Responds to an ADDED_TO_SPACE event in Hangouts Chat.
 *
 * @param {Object} event the event object from Hangouts Chat
 */
function onAddToSpace(event) {
  var message = "";

  if (event.space.type == "DM") {
    message = "Thank you for adding me to a DM, " + event.user.displayName + "!";
  } else {
    message = "Thank you for adding me to " + event.space.displayName;
  }

  if (event.message) {
    // Bot added through @mention.
    message = message + " and you said: \"" + event.message.text + "\"";
  }

  return { "text": message };
}

/**
 * Responds to a REMOVED_FROM_SPACE event in Hangouts Chat.
 *
 * @param {Object} event the event object from Hangouts Chat
 */
function onRemoveFromSpace(event) {
  console.info("Bot removed from ", event.space.name);
}


/////////////////////////////////////////////////////////////////////
// Helper functions
/////////////////////////////////////////////////////////////////////
function getSupportStoreString() {
  var SUPPORT_KEY = "supportEngineers";
  var scriptProperties = PropertiesService.getScriptProperties();
  return scriptProperties.getProperty(SUPPORT_KEY);
}

function setSupportStoreString(text) {
  var SUPPORT_KEY = "supportEngineers";
  var scriptProperties = PropertiesService.getScriptProperties();
  var currentSupport = scriptProperties.setProperty(SUPPORT_KEY, text);
}

function haveSupportEngineers() {
  var currentSupport = getSupportStoreString();
  return currentSupport != null && currentSupport != "";
}