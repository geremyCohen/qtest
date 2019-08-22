var AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-east-1'
});
var sqs = new AWS.SQS({
  apiVersion: '2012-11-05'
});
var stepfunctions = new AWS.StepFunctions();

var SQS_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/351853917711/gec-test-q-node-worker";

var lastTime = 0;

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

      if (Array.isArray(data.Messages)) {
        data.Messages.forEach(function(message) {

          var body = JSON.parse(message.Body);
          var tt = body.taskToken;
          var handle = message.ReceiptHandle;
          var opName = body.opName;

          var successParams = {
            output: "\"Received Message.\"",
            taskToken: tt
          };

          var ts = new Date().getTime();
          console.log("receivedFromSQS: " + opName + " ", ts);

          if (lastTime > 0) {
            console.log("\nTime since last token callback: ", ts - lastTime);
          }

          callbackToken(successParams, opName);

          var deleteParams = {
            QueueUrl: SQS_QUEUE_URL,
            ReceiptHandle: handle
          };

          receiveMessage();
          deleteMessage(deleteParams, opName);

        })
      }

      receiveMessage();
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