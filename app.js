// Get the current item values
var itemData = {};
$row.find("td").each(function (index) {
  if (index < $row.find("td").length - 1) {
    var fieldName = $("table thead th").eq(index).text();

    // Check if this is a media field
    if ($(this).find("img").length > 0) {
      itemData[fieldName] = $(this).find("img").attr("src");
    } else {
      var cellText = $(this).text();
      // Try to parse JSON if it looks like a stringified object
      if (cellText.startsWith("{") && cellText.endsWith("}")) {
        try {
          itemData[fieldName] = JSON.parse(cellText);
        } catch (e) {
          itemData[fieldName] = cellText;
        }
      } else {
        itemData[fieldName] = cellText;
      }
    }
  }
});
