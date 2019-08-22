var AWS = require('aws-sdk');
// Set the region
AWS.config.update({region: 'us-east-1'});

// Create an SQS service object
var sqs = new AWS.SQS({apiVersion: '2012-11-05'});

var stepfunctions = new AWS.StepFunctions();


var SQS_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/351853917711/gec-test-q-node-worker";

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


var receiveMessage = function(){
  sqs.receiveMessage(SQSParams, function(err, data) {
    if (err) {
      console.log("Error", err);
    } else {

            if (Array.isArray(data.Messages)){
            data.Messages.forEach(function(message){

                    var body = JSON.parse(message.Body);
                    var tt = body.taskToken;
                    var handle = message.ReceiptHandle;
                    var opName = body.opName;

                    // console.log("body: ", body.opName);
                    // console.log("\nReceived TT: ", tt);

                    var successParams = {
                        output: "\"Received Message.\"",
                        taskToken: tt
                    };

                    var ts = process.hrtime();
                    console.log("receivedFromSQS: " + opName + " ", ts);

  sendSuccess(successParams, opName);

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


var sendSuccess = function(successParams, opName){
                  //console.log(`Calling Step Functions to complete callback task with params ${JSON.stringify(successParams)}`);

        stepfunctions.sendTaskSuccess(successParams, (err, data) => {
                      if (err) {
                          console.error(err.message);
                          return;
                      }
                      //console.log(data);
                      var ts = process.hrtime();
                      console.log("tokenCallbackToStepFunc: " + opName + " ", ts);
                  });

}

var deleteMessage = function(deleteParams, opName){


        sqs.deleteMessage(deleteParams, function(err, data) {
      if (err) {
        console.log("Delete Error", err);
      } else {

        //var ts = process.hrtime();
        //console.log("deleteFromSQS: " + opName + " ", ts);
        //console.log("Message Deleted", data);
      }
    });

}

receiveMessage()
