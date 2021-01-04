// Url to google spreadsheet contaning PNCSUP issues statistics
spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1U5hMgVopnEmz6RNCRYSwMKlVtp2oW8r7XtHna9OhS58/edit#gid=1277613764';
googleChatUrl = 'https://chat.google.com/';

/**
 * Responds to a MESSAGE event in Hangouts Chat.
 *
 * @param {Object} event the event object from Hangouts Chat
 */
function onMessage(event) {
  
  var message = ""; // response
  var text = event.message.text;
  var textWords = text.split(" ");
  var command = textWords[1];
  
  Logger.log(JSON.stringify(event));
    
  // CATEGORY REGION ==========================================================
    
  // Add cetagory to issue statistics  
  if (command === "create") {
    
    category = textWords[2].toUpperCase();
    message = addNewCategory(category);
    
    // Remove current issue from category  
  } else if (command === "remove") {
    
    message = removeIssue(event.message.thread.name);
    
    // Add current issue to category  
  } else if (command === "add") {
    
    category = textWords[2].toUpperCase();
    message = storeIssue(event.message.thread.name, category, event.eventTime);
    
  } 
   
   
  if (message == "") {
     message = getCategoryHelp();
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

  message = "Thank you for adding me to " + event.space.displayName;

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

function addNewCategory(category) {
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl).getSheetByName("Categories");
  
  if (categoryExists(category)) {
    return "Sorry, category *" + category + "* already exists";
  }
  
  var values = [[category]];
  var lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1).setValues(values);
  
  return "Category *" + category + "* sucessfully added";
}


function storeIssue(thread, category, time) {
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl).getSheetByName("Data");
  var message = "Thread successfully added to category *" + category + "*";
  
  if (!categoryExists(category)) {
    return "Sorry, category *" + category + "* does not exist. Try adding it with: *create <categoryName>*";
  }
  
  var timestamp = toDate(time.seconds);
  var rowToUpdate = sheet.getLastRow() + 1;
  var threadUrl = getThreadUrl(thread, 0);
  
  // Check if thread is already in the list
  var data = sheet.getRange(2, 1, Math.max(sheet.getLastRow()-1, 1), 4).getValues();
  for (var row=0; row < data.length; row++){
    if (data[row][0] === threadUrl) {
      rowToUpdate = row + 2;
      message = "Changing the category from *" + data[row][2] + "* to *" + category + "*";    
    }
  }
  
  var values = [[threadUrl, getThreadUrl(thread, 1), category, timestamp]];
  
  sheet.getRange(rowToUpdate, 1, 1, 4).setValues(values);
  
  return message;
}


function removeIssue(thread) {
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl).getSheetByName("Data");
  
  var rowToDelete = 0;
  var message = "Sorry, the thread is not in any category"
  var threadUrl = getThreadUrl(thread, 0);
  
  // Check if thread is already in the list
  var data = sheet.getRange(2, 1, Math.max(sheet.getLastRow()-1, 1), 4).getValues();
  for (var row=0; row < data.length; row++){
    if (data[row][0] === threadUrl) {
      rowToDelete = row + 2;
      message = "The thread removed from category *" + data[row][2] + "*";    
    }
  }
  
  if (rowToDelete) {
    sheet.deleteRow(rowToDelete);
  } 
  
  return message;
}


function getThreadUrl(thread, account) {
  var threadRegex = /(spaces\/)(.*)(\/threads\/)(.*)/;
  var spaceID = threadRegex.exec(thread)[2]
  var threadID = threadRegex.exec(thread)[4]
  
  return googleChatUrl + 'u/' + account + "/room/" + spaceID + "/" + threadID;
}


function categoryExists(category) {
  var sheet = SpreadsheetApp.openByUrl(spreadsheetUrl).getSheetByName("Categories");
  
  var categories = sheet.getRange(1, 1, sheet.getLastRow()).getValues().flat();
  return categories.includes(category);
}


function toDate(seconds) {
    var u = new Date(seconds*1000);
    return u.toISOString();
}
  

function getCategoryHelp() {
  return "Sorry, did not understand your request.\n\n"
  + "Try the following: \n"
  + "  *create <name>* to create new category\n"
  + "  *add <name>* to add this thread to category\n"
  + "  *remove* to remove this thread from category"
}









