// Url to google spreadsheet contaning PNCSUP issues statistics
spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/1U5hMgVopnEmz6RNCRYSwMKlVtp2oW8r7XtHna9OhS58/edit#gid=1277613764';
// spreadsheetUrl = 'https://docs.google.com/spreadsheets/d/17D6i87fPvf9Rx3UCWxMxkq3Qpa_us15dbCQl8bQZEP8/edit#gid=0'; // Testing sheet
googleChatUrl = 'https://chat.google.com/';
jiraSupportBoardUrl = ''; // Fill in the jira board URL

/**
 * Responds to a MESSAGE event in Hangouts Chat.
 *
 * @param {Object} event the event object from Hangouts Chat
 */
function onMessage(event) {

  dataSheet = SpreadsheetApp.openByUrl(spreadsheetUrl).getSheetByName("Data");
  categoriesSheet = SpreadsheetApp.openByUrl(spreadsheetUrl).getSheetByName("Categories");
  directMessage = event.space.type === 'DM';

  let response = "";
  let text = event.message.text;
  let textWords = text.split(/\s+/);
  // Differ between calling the bot through the bot reference ('@botname') or in a private message directly
  let commandPosition = directMessage ? 0 : 1;
  let command = textWords[commandPosition];

  Logger.log(JSON.stringify(event));
  Logger.log(command)

  // Get info about current thread
  if (!command) {

    response = getThreadInfo(event.message.thread.name);

    // Add cetagory to issue statistics  
  } else if (command === "create" && textWords.length > commandPosition + 1) {

    let category = textWords[commandPosition + 1].toUpperCase();
    response = addNewCategory(category);


  } else if (command === "categories") {

    response = listCategories();

    // Remove current issue from category  
  } else if (command === "remove") {

    response = removeIssue(event.message.thread.name);

    // Add current issue to category  
  } else if (command === "add") {

    let category = textWords[commandPosition + 1] ? textWords[commandPosition + 1].toUpperCase() : 'UNCATEGORIZED';
    let overwrite = textWords[commandPosition + 1] ? true : false;
    response = storeIssue(event.message.thread.name, category, event.eventTime, event.user.displayName, overwrite);

    // Assign a Jira ticket to current thread
  } else if (command === "jira" && textWords.length > commandPosition + 1) {

    let jira = textWords[commandPosition + 1].toUpperCase();
    response = addJira(event.message.thread.name, jira);

    // Assign a product to current thread
  } else if (command === "product" && textWords.length > commandPosition + 1) {

    let product = textWords[commandPosition + 1];
    response = addProduct(event.message.thread.name, product);

  } else {
    response = "Sorry, did not understand your request.\n\n" + getHelp();
  }

  return { "text": response };
}



/**
 * Responds to an ADDED_TO_SPACE event in Hangouts Chat.
 *
 * @param {Object} event the event object from Hangouts Chat
 */
function onAddToSpace(event) {
  let response = "";

  response = "Thank you for adding me to " + event.space.displayName;

  if (event.message) {
    // Bot added through @mention.
    response = response + "\n" + getHelp();
  }

  return { "text": response };
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
  if (categoryExists(category)) {
    return "Sorry, category *" + category + "* already exists";
  }

  let values = [[category]];
  let lastRow = categoriesSheet.getLastRow();
  categoriesSheet.getRange(lastRow + 1, 1).setValues(values);

  return "Category *" + category + "* sucessfully added";
}


function storeIssue(thread, category, time, user, overwrite) {
  let response = "Thread successfully added to category *" + category + "*";

  if (!categoryExists(category)) {
    return "Sorry, category *" + category + "* does not exist.\n\n"
      + "You can use one of these:\n" + listCategories() + "\n"
      + "Or try adding a new one with: *create <categoryName>*";
  }

  let timestamp = toDate(time.seconds);
  let rowToUpdate = dataSheet.getLastRow() + 1;
  let threadUrl = getThreadUrl(thread, 0);

  // Check if thread is already in the list
  let row = getThreadRowIfExists(threadUrl);
  if (row) {
    let data = getRowData(row);
    if (overwrite) {
      rowToUpdate = row;
      response = "Changing the category from *" + data[2] + "* to *" + category + "*";
      timestamp = data[3]; // Keep the timestamp from the first assignment 
      user = data[6]; // Keep the user who assigned this first
    } else {
      return "This thread is already in *" + data[2] + "* category";
    }
  }

  let values = [[threadUrl, getThreadUrl(thread, 1), category, timestamp]];

  dataSheet.getRange(rowToUpdate, 1, 1, 4).setValues(values);
  dataSheet.getRange(rowToUpdate, 7, 1, 1).setValue(user);

  return response;
}


function addJira(thread, jira) {
  let response = "";
  let row = getThreadRowIfExists(getThreadUrl(thread, 0));

  if (row) {
    dataSheet.getRange(row, 5, 1, 1).setFormula(`=HYPERLINK("${jiraSupportBoardUrl}${jira}","${jira}")`);
    response = "Jira *" + jira + "* was successfuly assigned to this thread";
  } else {
    response = "Sorry, this thread is not added in any category. Use *add* command first"
  }
  return response;
}


function addProduct(thread, product) {
  let row = getThreadRowIfExists(getThreadUrl(thread, 0));

  if (row) {
    dataSheet.getRange(row, 6, 1, 1).setValue(product);
  } else {
    return "Sorry, this thread is not added in any category. Use *add* command first"
  }
  return "Product *" + product + "* was successfuly assigned to this thread";
}


function getRowData(row) {
  return dataSheet.getRange(row, 1, 1, 7).getValues().flat();
}


function getThreadRowIfExists(threadUrl) {
  let data = dataSheet.getRange(2, 1, Math.max(dataSheet.getLastRow() - 1, 1), 1).getValues();

  for (let row = 0; row < data.length; row++) {
    if (data[row][0] === threadUrl) {
      return row + 2;
    }
  }
  return 0;
}


function removeIssue(thread) {
  let threadUrl = getThreadUrl(thread, 0);

  // Check if thread is already in the list
  let row = getThreadRowIfExists(threadUrl);
  if (row) {
    dataSheet.deleteRow(row);
  } else {
    return "Sorry, the thread is not in any category";
  }

  return "The thread is not assigned to any category now";
}


function getThreadInfo(thread) {
  let threadUrl = getThreadUrl(thread, 0);

  // Check if thread is already in the list
  let row = getThreadRowIfExists(threadUrl);
  let data = "";
  if (row) {
    data = getRowData(row);
  } else {
    return "Sorry, the thread is not assigned to any category";
  }

  return "This thread info:\n"
    + "  Category: *" + data[2] + "*\n"
    + "  Jira: *" + (data[4] ? data[4] : "-") + "*\n"
    + "  Product: *" + (data[5] ? data[5] : "-") + "*";
}


function getThreadUrl(thread, account) {
  let threadRegex = /(spaces\/)(.*)(\/threads\/)(.*)/;
  let spaceID = threadRegex.exec(thread)[2]
  let threadID = threadRegex.exec(thread)[4]

  return googleChatUrl + 'u/' + account + "/room/" + spaceID + (directMessage ? "" : "/" + threadID);
}


function categoryExists(category) {
  let categories = categoriesSheet.getRange(1, 1, categoriesSheet.getLastRow()).getValues().flat();
  return categories.includes(category);
}


function listCategories() {
  let categories = categoriesSheet.getRange(1, 1, categoriesSheet.getLastRow()).getValues().flat();
  return categories.reduce((acc, cat) => acc + `*${cat}*\n`, "");
}


function toDate(seconds) {
  let u = new Date(seconds * 1000);
  return u.toISOString();
}


function getHelp() {
  return "Available commands: \n"
    + "  *create <name>* to create new category\n"
    + "  *add <name>* to add this thread to a category\n"
    + "  *remove* to remove this thread from a category\n"
    + "  *jira <jira-key>* to assign a Jira ticket to this thread\n"
    + "  *product <product-name>* to assign a product to this thread\n"
    + "  *categories* to list all existing categories"
}









