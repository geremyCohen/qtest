var AWS = require('aws-sdk');
const path = require('path');

AWS.config.update({
  region: 'us-east-1'
});
var sqs = new AWS.SQS({
  apiVersion: '2012-11-05'
});
var stepfunctions = new AWS.StepFunctions();

if (process.argv.length != 3) {
  console.log("\nusage: node " + path.basename(process.argv[1]) + " SQS_QUEUE_URL\n");
  return;
}
var SQS_QUEUE_URL = process.argv[2];

var lastTime = 0;
var jobStart = 0;
var jobEnd = 0;

var SQSParams = {
  AttributeNames: [
    "SentTimestamp"
  ],
  MaxNumberOfMessages: 1,
  MessageAttributeNames: [
    "All"
  ],
  QueueUrl: SQS_QUEUE_URL,
  WaitTimeSeconds: 20
};

var receiveMessage = function() {
  sqs.receiveMessage(SQSParams, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {

      receiveMessage(); // initiate receiving / processing the next message potentially even before stepfunctions.sendTaskSuccess returns

      if (Array.isArray(data.Messages)) {
        data.Messages.forEach(function(message) {

          var ts = new Date().getTime();

          var body = JSON.parse(message.Body);
          var tt = body.taskToken;
          var handle = message.ReceiptHandle;
          var opName = body.opName;

          if (opName == "DummyLoadOp1") {
            jobStart = ts;
          }

          var successParams = {
            output: "\"Received Message.\"",
            taskToken: tt
          };


          if (lastTime > 0) {
            console.log("\nTime since last token callback: ", ts - lastTime);
          }

          console.log("receivedFromSQS: " + opName + " ", ts);

          callbackToken(successParams, opName);

          var deleteParams = {
            QueueUrl: SQS_QUEUE_URL,
            ReceiptHandle: handle
          };
          deleteMessage(deleteParams, opName);
        })
      }
    }
  });
}

var callbackToken = function(successParams, opName) {
  //console.log(`Calling Step Functions to complete callback task with params ${JSON.stringify(successParams)}`);

  stepfunctions.sendTaskSuccess(successParams, (err, data) => {
    if (err) {
      console.error(err.message);
      return;
    }

    var ts = new Date().getTime();
    console.log("tokenCallbackToStepFunc: " + opName + " ", ts);

    lastTime = ts;

    if (opName == "FinalOp") {
      jobEnd = ts;
      console.log("\n\nJob Ended in : " + (jobEnd - jobStart) + "ms.");
    }
  });
}

var deleteMessage = function(deleteParams, opName) {


  sqs.deleteMessage(deleteParams, function(err, data) {
    if (err) {
      console.log("Delete Error", err);
    } else {

    }
  });

}

receiveMessage()