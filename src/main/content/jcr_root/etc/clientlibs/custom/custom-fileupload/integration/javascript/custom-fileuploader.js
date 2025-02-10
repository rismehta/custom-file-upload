/**
 *
 * Options expected by file preview is the url
 *
 * Options Required Are:
 *
 *  iframeName: Name of the Iframe
 *  iframeContainer: Container of the iframe(eg Body)
 *  fileUploadPath: Path where the file is to be uploaded
 *  fileUploadServlet: Servlet where the file is to be uploaded
 *
 */
(function ($, _) {

    var CustomFileUploader = function (element, options) {
        this.options = options;
        this.$element = $(element);
    };

    CustomFileUploader.prototype = {

        _fileIframeName: "guide-fu-iframe",

        _filePath: "/tmp/fd/mf",

        _iframeContainer: "body#formBody",


        fileIframe: function (name) {
            return $("<iframe></iframe>").attr({
                style: "display:none",
                name: name
            });
        },

        uploadFile: function (fileObject) {
            var multiple = false,
                fileName = null,
                s3UploadUrl = null, // URL for getting S3 presigned URL
                uuid;

            if (!fileObject.fileUploadPath) {
                uuid = fileObject._uuidGenerator();
            }

            // if uuid exists only then upload the file in the current instance
            if (_.isObject(fileObject) && (fileObject.fileUploadPath || uuid)) {
                var fileDom = fileObject.fileDom,
                    $form = $(this.options.iframeContainer).find(".filePreview");
                fileName = fileObject.fileName;
                multiple = fileObject.multiple;
                
                if (!fileObject.fileUploadPath) {
                    fileObject.fileUploadPath = this.options.fileUploadPath + "/" + uuid;
                }

                if (fileDom !== null) {
                    // Set the S3 upload endpoint
                    s3UploadUrl = fileObject._getUrl + "/services/s3/presign";
                    
                    if (!multiple) {
                        this.fileUrl = fileObject.fileUploadPath + "/" + fileName;
                    } else {
                        this.fileUrl = fileObject.fileUploadPath;
                    }

                    var self = this;

                    if (multiple) {
                        // Handle multiple file upload
                        var uploadPromises = [];
                        
                        _.each(fileDom, function(fileDomElement, index) {
                            if (fileDomElement !== null && !_.isString(fileDomElement)) {
                                var currentFileNames = fileName[index].split("\n");
                                
                                for (var fileIndex = 0; fileIndex < currentFileNames.length; fileIndex++) {
                                    var currentFile = fileDomElement[0].files[fileIndex];
                                    uploadPromises.push(self.uploadFileToS3(currentFile, s3UploadUrl, currentFileNames[fileIndex]));
                                }
                            }
                        });

                        // Wait for all files to upload
                        Promise.all(uploadPromises)
                            .then(function(results) {
                                self.handleMultipleFileUpload(results);
                            })
                            .catch(function(error) {
                                console.error("Error uploading files:", error);
                                self.$element.trigger("customFileUploader.fileUploadFailed");
                            });

                    } else {
                        // Handle single file upload
                        var file = fileDom[0].files[0];
                        this.fileMap[this.fileUrl] = this.$element;
                        
                        this.uploadFileToS3(file, s3UploadUrl, fileName)
                            .then(function(result) {
                                self.handleSingleFileUpload(result);
                            })
                            .catch(function(error) {
                                console.error("Error uploading file:", error);
                                self.$element.trigger("customFileUploader.fileUploadFailed");
                            });
                    }
                }
            }
            return this.fileUrl;
        },

        // New helper method to handle file upload
        // Sample implementation that returns a resolved promise with URL
        uploadFileToS3: function(file, presignEndpoint, fileName) {
            var self = this;
        
            // Return a resolved promise with a sample URL
            // This is just for testing - replace with actual implementation
            return new Promise(function(resolve) {
                // Simulate network delay
                setTimeout(function() {
                    // For testing: construct a sample URL using the fileName
                    var sampleUrl = presignEndpoint + "/" + fileName;
                    
                    // Return an object with url and other metadata
                    resolve({
                        success: true,
                        url: sampleUrl,
                        fileName: fileName,
                        fileSize: file.size,
                        fileType: file.type,
                        lastModified: file.lastModified
                    });
                }, 500); // 500ms delay to simulate network request
            });

            /* Real implementation would look like this:
            return $.ajax({
                url: presignEndpoint,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    fileName: fileName,
                    contentType: file.type
                })
            })
            .then(function(presignedData) {
                return $.ajax({
                    url: presignedData.url,
                    method: 'PUT',
                    data: file,
                    processData: false,
                    contentType: file.type,
                    headers: presignedData.headers || {}
                });
            })
            .then(function() {
                return {
                    success: true,
                    url: self.fileUrl,
                    fileName: fileName
                };
            });
            */
        },

        handleMultipleFileUpload: function (data) {
            this.$element.trigger("customFileUploader.multipleFileUploaded");
        },

        getFileUrl: function () {
            return this.fileUrl;
        },

        handleSingleFileUpload: function (result) {
            // Check if result is an object with url property
            var url = (result && result.url) ? result.url : result;
            if (url && url in this.fileMap) {
                this.fileMap[url].trigger("customFileUploader.fileUploaded");
            }
        },

        initialize: function () {
            // Put iframe inside the iframe container
            // On the load of iframe, display the contents of file
            // since there is only one iframe for all the file attachments, there may be race condition
            if (this.$iframe == null || this.$iframe.length === 0) {
                this.$iframe = this.fileIframe(this.options.iframeName).appendTo(this.options.iframeContainer);
                // since there is only iframe for the preview of all file attachments
                // this map is added in the closure scope
                // map contains the url(key) vs fileDomElement(value)
                // it helps avoids the race condition
                this.fileMap = {};
            }
        }
    };

    $.fn.customFileUploader = function (option, value) {
        var get = '',
            element = this.each(function () {
                // in case of input type file
                if ($(this).attr('type') === 'file') {
                    var $this = $(this),
                        data = $this.data('customFileUploader'),
                        options = $.extend({}, CustomFileUploader.prototype.defaults(option, value), typeof option === 'object' && option);

                    // Save the custom file uploader data in jquery
                    if (!data) {
                        $this.data('customFileUploader', (data = new CustomFileUploader(this, options)));
                        data.initialize();
                    } else {
                        // update elements if not equal, since sometimes one can clone too
                        if(data.$element.get(0) !== this) {
                            data.$element = $(this);
                        }
                    }

                    // code to get and set an option
                    if (typeof option === 'string') {
                        get = data[option](value);
                    }
                }
            });

        if (typeof get !== 'undefined') {
            return get;
        } else {
            return element;
        }
    };


    CustomFileUploader.prototype.defaults = function (options,value)  {
        var propertyObject = {};
        if(typeof options == 'object') {
            propertyObject._fileIframeName = options._fileIframeName;
            propertyObject._filePath = options._filePath;
            propertyObject.actionUrl = options.actionUrl;
            propertyObject._getUrl = options._getUrl;
        }
        if(typeof  value == 'object') {
            propertyObject._fileIframeName = value._fileIframeName;
            propertyObject._filePath = value._filePath;
            propertyObject.actionUrl = value.actionUrl;
            propertyObject._getUrl = options._getUrl;
        }
        return {
            'fileUploadPath': propertyObject._filePath || CustomFileUploader.prototype._filePath,
            'iframeName': CustomFileUploader.prototype._fileIframeName + new Date().valueOf(),
            'fileUploadServlet': propertyObject._filePath || CustomFileUploader.prototype._filePath,
            'iframeContainer': propertyObject._iframeContainer || CustomFileUploader.prototype._iframeContainer,
            '_getUrl': propertyObject._getUrl || ""
        };
    };

})($, window._);