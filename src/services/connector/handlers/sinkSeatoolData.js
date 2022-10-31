function myHandler(event, _context, _callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
}

exports.handler = myHandler;
