
$(document).ready(function() {
    
    let faceid = window.location.search.substring(1);
    $("#submitBtn").click(function() {
        let otp = document.getElementById("otp").value;

        let apigClient = apigClientFactory.newClient();
        console.log("hihi");
        let params = {};
        let body = {
            "faceid": faceid,
            "otp": otp
        };
        console.log("hihi");
        let additionalParams = {};
        console.log(body);

        apigClient.otpPost(params, body, additionalParams).then(
        function(response){
            console.log(response.data);
            window.alert(response.data.Message); 
        }
    );
    });

});


// function sendOTP() {
//     let otp = document.getElementById("otp").value;

//     let apigClient = apigClientFactory.newClient();
//     let params = {};
//     let body = {
//         "otp": otp
//     };
//     let additionalParams = {};
//     console.log(body);

//     apigClient.otpPost(params, body, additionalParams).then(
//         function(response){
//             console.log(response.data);
//             window.alert(response.data.Message);            
//         }
//     );
// }