$(document).ready(function() {
    var photoSet = []

    try {
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        var recognition = new SpeechRecognition();
      }
    catch(e) {
        console.error(e);
    }
    
    var noteTextarea = $('#content');
    var instructions = $('#instructions');

    var noteContent = '';

    recognition.continuous = true;
    recognition.onresult = function(event) {
        var current = event.resultIndex;
        var transcript = event.results[current][0].transcript;
        var mobileRepeatBug = (current == 1 && transcript == event.results[0][0].transcript);
        if(!mobileRepeatBug) {
            noteContent += transcript;
            noteTextarea.val(noteContent);
        }
    };

    recognition.onstart = function() { 
        instructions.text('Voice recognition activated. Try speaking into the microphone.');
    }
      
    recognition.onspeechend = function() {
        instructions.text('You were quiet for a while so voice recognition turned itself off.');
    }
      
    recognition.onerror = function(event) {
        if(event.error == 'no-speech') {
            instructions.text('No speech was detected. Try again.');  
        };
    }

    noteTextarea.on('input', function() {
        noteContent = $(this).val();
    })

    function saveNote(dateTime, content) {
        localStorage.setItem('note-' + dateTime, content);
    }

    $("#play").click(function() {
        if (noteContent.length) {
            noteContent += ' ';
        }
        recognition.start();
    });

    $("#pause").click(function() {
        recognition.stop();
        instructions.text('Voice recognition paused.');
    });

    $("#search").click(function() {
        $("#photo").empty();
        recognition.stop();
        var content = document.getElementById("content").value;
        // var content = noteContent;

        if(!noteContent.length) {
          instructions.text('Could not search empty content. Please type or say something.');
        }
        else {
        //   saveNote(new Date().toLocaleString(), noteContent);     
          // Reset variables and update UI.
          noteContent = '';
          noteTextarea.val('');
        }

        // var content = document.getElementById("content").value;
        
        var apigClient = apigClientFactory.newClient();
        var params = {
            'q': content
        };
        var body = {
            'q': content
        };
        var additionalParams = {
            queryParams: { 
                'q': content 
            } 
        };
        console.log(content);

        apigClient.searchGet(params, body, additionalParams).then(
        function(response){
            console.log("response");
            console.log(response);
            var list = JSON.parse(response.data.body);
            if(list.length == 0) {
                instructions.text('No photos match.');
            }
            else {
                $(instructions).hide();
                for(var i = 0; i < list.length; i++) {
                    var src = "https://"+ list[i][0]+".s3.amazonaws.com/"+list[i][1];
                    console.log(src);
                    $("<img src="+ src +">").appendTo("#photo")
                }    
            }
        });

    });
    $("#upload").click(function() {
        var files = document.getElementById('select').files;
        var albumBucketName = "cc-photo-album";
        var bucketRegion = "us-east-1";
        var albumName = "hw3";

        AWS.config.update({
            region: bucketRegion,
            credentials: new AWS.CognitoIdentityCredentials({
                IdentityPoolId: 'us-east-1:a2958118-bab4-4d57-b11e-b1025c302496'
              })
          });

        var s3 = new AWS.S3({
            apiVersion: "2006-03-01",
            params: { Bucket: albumBucketName }
        });

        createAlbum(albumBucketName, albumName, s3);
        addPhoto(albumBucketName, albumName, s3);

    });
    $("#file").click(function() {
        fileSelect();
    });


    function fileSelect() {
        document.getElementById('select').click();
    }

    function createAlbum(albumBucketName, albumName, s3) {
        albumName = albumName.trim();
        if (!albumName) {
            return alert("Album names must contain at least one non-space character.");
        }
        if (albumName.indexOf("/") !== -1) {
            return alert("Album names cannot contain slashes.");
        }
        var albumKey = encodeURIComponent(albumName) + "/";
        s3.headObject({ Key: albumKey }, function(err, data) {
            if (!err) {
                return alert("Album already exists.");
            }
            if (err.code !== "NotFound") {
                return alert("There was an error creating your album: " + err.message);
            }
            s3.putObject({ Key: albumKey }, function(err, data) {
                if (err) {
                    return alert("There was an error creating your album: " + err.message);
                }
                alert("Successfully created album.");
                viewAlbum(albumBucketName, albumName, s3);
            });
        });
    }
      


    function viewAlbum(albumBucketName, albumName, s3) {
        var albumPhotosKey = encodeURIComponent(albumName) + "//";
        s3.listObjects({ Prefix: albumPhotosKey }, function(err, data) {
            if (err) {
                return alert("There was an error viewing your album: " + err.message);
            }
            // 'this' references the AWS.Response instance that represents the response
            var href = this.request.httpRequest.endpoint.href;
            var bucketUrl = href + albumBucketName + "/";
      
            var photos = data.Contents.map(function(photo) {
                var photoKey = photo.Key;
                var photoUrl = bucketUrl + encodeURIComponent(photoKey);
                return getHtml([
                    "<span>",
                    "<div>",
                    '<img style="width:128px;height:128px;" src="' + photoUrl + '"/>',
                    "</div>",
                    "<div>",
                    "<span onclick=\"deletePhoto('" +
                        albumName +
                        "','" +
                        photoKey +
                        "')\">",
                    "X",
                    "</span>",
                    "<span>",
                    photoKey.replace(albumPhotosKey, ""),
                    "</span>",
                    "</div>",
                    "</span>"
                ]);
            });
            var message = photos.length
                ? "<p>Click on the X to delete the photo</p>"
                : "<p>You do not have any photos in this album. Please add photos.</p>";
            var htmlTemplate = [
                "<h2>",
                "Album: " + albumName,
                "</h2>",
                message,
                "<div>",
                getHtml(photos),
                "</div>",
                '<input id="photoupload" type="file" accept="image/*">',
                '<button id="addphoto" onclick="addPhoto(\'' + albumName + "')\">",
                "Add Photo",
                "</button>",
                '<button onclick="listAlbums()">',
                "Back To Albums",
                "</button>"
            ];
            document.getElementById("app").innerHTML = getHtml(htmlTemplate);
        });
    }


    function addPhoto(albumBucketName, albumName, s3) {
        var files = document.getElementById("select").files;
        if (!files.length) {
          return alert("Please choose a file to upload first.");
        }
        var file = files[0];
        var fileName = file.name;
        var albumPhotosKey = encodeURIComponent(albumName) + "/";
      
        var photoKey = albumPhotosKey + fileName;
      
        // Use S3 ManagedUpload class as it supports multipart uploads
        var upload = new AWS.S3.ManagedUpload({
          params: {
            Bucket: albumBucketName,
            Key: photoKey,
            Body: file,
            ACL: "public-read"
          }
        });
      
        var promise = upload.promise();
      
        promise.then(
          function(data) {
            // alert("Successfully uploaded photo.");
            console.log(data);
            viewAlbum(albumBucketName, albumName, s3);
          },
          function(err) {
            return alert("There was an error uploading your photo: ", err.message);
          }
        );
      }
      
      function getHtml(template) {
        return template.join('\n');
     }
})