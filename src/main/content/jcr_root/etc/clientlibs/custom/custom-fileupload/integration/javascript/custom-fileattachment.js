(function ($, window, _) {

    var _defaults = {
        placeHolderText : "Enter comments here"
    };

    var CustomFileAttachment = function (element, options) {
        this.options = options;
        // Set the uploaderPluginName to customFileUploader
        this.options.uploaderPluginName = "customFileUploader";
        this.$elementFileUploadBtn = [];
        this.$elementFileList = [];
        this.$element = $(element);
        if (this.$element.attr("multiple") && !xfalib.ut.Utilities._isDataContainerSupported()) {
            // remove multiple attribute if multi file selection in one go is not supported
            this.$element.removeAttr("multiple");
        }
        this.$parent = this.$element.parent();
        this.invalidFeature = {
            "SIZE":1,
            "NAME":2,
            "MIMETYPE":3
        };
        Object.freeze(this.invalidFeature);
        // initialize the regex initially
        this.regexMimeTypeList  = this.options.mimeType.map(function (value, i) {
            try {
                return new RegExp(value.trim());
            } catch (e) {
                // failure during regex parsing, don't return anything specific to this value since the value contains
                // incorrect regex string
                if(window.console) {
                    console.log(e);
                }
            }
        });
    };

    var isBrowserIE9OrIE10 = ($.browser.msie && ($.browser.version === '9.0' || $.browser.version === '10.0')),
        fileLabelsCount = 0;


    CustomFileAttachment.prototype = {
        _fileIframeName : "guide-fu-iframe",
        _addFile : "Add File",

        clear: function () {
            this.$element.val('');
            this.$elementFileList.empty();
        },

        destroy: function () {
            this.$fileDomElements = $.map(this.$fileDomElements, function(item){
                // since item can be null or object, doing this check
                if(_.isObject(item) && item.val().length === 0) {
                    //TODO: remove item from dom, since there is a memory leak
                    return item;
                }
            });
            this.values = [];
            if(isBrowserIE9OrIE10){
                if(_.last(this.$fileDomElements) == null){
                    this.cloneFileInputAndUpdateIdForIE9();
                } else {
                    this.updateLabelForAttr(_.last(this.$fileDomElements).attr("id"));
                }
            }
            this.$element.trigger("change.fileupload");
        },

        _setUrl : function(url, index){
            this.$elementFileList.find("span.guide-fu-fileName").eq(index).data("key", url);
        },

        _getUrl : function(index) {
            return this.$elementFileList.find("span.guide-fu-fileName").eq(index).data("key");
        },
        getSetFilePathAndReturnNamePathMap: function(valueList) {

            var mapOfObjectsHavingTempPathAndFileNames = {},
                $temp,
                tempPath;

            $.each(this.$elementFileList.children(), function ( index, childLiElement) {
                $temp = $(childLiElement).find("span.guide-fu-fileName");
                tempPath = $temp.data("key");
                if(!tempPath && valueList && valueList[index]) {
                    $temp.data("key", valueList[index]);
                }
                mapOfObjectsHavingTempPathAndFileNames[$temp.html()] = tempPath || $temp.data("key");
            });
            return mapOfObjectsHavingTempPathAndFileNames;
        },


        value : function(value) {
            if(!_.isUndefined(value)) {
                var _self = this,
                    comments = this.comment(),
                    isChange = false,
                    fileNames = _.isArray(this.options.fileNames) ? this.options.fileNames : null,
                    oldUrls = {};
                // Cache the url before deletion
                this.$elementFileList.children().find("span.guide-fu-fileName").each(function(){
                    var url = $(this).data("key");
                    if(!_.isUndefined(url)){
                        var fileName = url.substring(url.lastIndexOf("/") + 1);
                        oldUrls[fileName] = url;
                    }
                });
                this.$elementFileList.empty();
                if(value != null) {
                    var arr = value.split("\n");
                    // contruct initial file name and value map
                    // this is done only once in entire live cycle, its done here, since we get value here
                    if (fileNames && _.isEmpty(this._initialFileValueFileNameMap)) {
                        for (var index = 0; index < fileNames.length; index++) {
                            _self._initialFileValueFileNameMap[arr[index]] = fileNames[index]
                        }
                    }
                    // Update the value array with the file
                    this.values = _.map(arr, function(fileName, index){
                        // Check if file Name is a path, if yes get the last part after "/"
                        var slash = fileName.lastIndexOf("/"),
                            fileUrl = fileName,
                            fileUploadUrl = null;
                        if(slash !== -1) {
                            // Store the cached url here
                            fileUrl = fileUploadUrl = fileName;
                            fileName = fileName.substring(slash + 1);
                            // case: when you click on save second time
                            if((_.isObject(_self.$fileDomElements[index]) && _self.$fileDomElements[index].val().length > 0) || _.isString(_self.$fileDomElements[index])){
                                isChange = true;
                                _self.$fileDomElements[index] = null;
                            } else if(_self.$fileDomElements[index] !== null) { // create a dummy file dom for the cached value
                                 isChange = true;
                                _self.$fileDomElements.splice(index, 0, null);
                            }
                        } else if (oldUrls[fileName]) {
                            fileUploadUrl = oldUrls[fileName];
                        }
                        // if fileNames options is explicitly passed, use it
                        if (fileNames && _self._initialFileValueFileNameMap[fileUrl]) {
                            fileName = _self._initialFileValueFileNameMap[fileUrl];
                        }
                        _self.showFileList(fileName, comments[index], fileUploadUrl);
                        return fileUrl;
                    });
                    if(isChange){
                        this.$element.trigger("change.fileupload");
                    }
                } else {
                    if(_.isArray(this.values) && this.values.length !== 0){
                        this.destroy();
                    }
                }
            }
            else {
                return this.values;
            }
        },

        fileAttachment: function(){
            return this.values;
        },

        comment : function(value){
            var _self = this,
                $elem = null,
                comments;
            if (!_.isUndefined(value)) {
                if(value != null) {
                    comments = value.split("\n");
                    $elem = this.$elementFileList.find('div.guide-fu-comment');
                    $elem.each(function(index){
                        $(this).text(comments[index]);
                    });
                }
            }
            else {
                $elem = this.$elementFileList.find('div.guide-fu-comment');
                comments = [];
                $elem.each(function(){
                    comments.push($(this).text());
                });
                return comments;
            }
        },

        multiSelect : function(value){
            if(value !== undefined)
                this.options.multiSelect = value;
            else
                return this.options.multiSelect;
        },

        fileSizeLimit : function(value){
            if(value !== undefined)
                this.options.fileSizeLimit = value;
            else
                return this.options.fileSizeLimit;
        },

        mimeType : function(value){
            if(value !== undefined)
                this.options.mimeType = value;
            else
                return this.options.mimeType;
        },

        access : function(value){
            if(value == "readOnly") {
                this.$element.attr("disabled", "disabled");
                //for readOnly hide the delete icon in file list
                $(this.$parent).addClass('guide-fu-disabled');
            }
            else if(value == "open") {
                this.$element.removeAttr("disabled");
                $(this.$parent).removeClass('guide-fu-disabled');
            }
        },

        fileList : function(value) {
            var filtered,
                _self = this;
            if(value !== undefined){
                this.$fileDomElements = [];
                _.each(value, function(item, index){
                    if((_.isObject(item) && (isBrowserIE9OrIE10 || item.val().length > 0)) || (_.isString(item))){
                         // check if index is within the length
                         // this is written for delete case
                         // if item is a string, then it should be set null
                         if(_.isString(item)){
                             item = null;
                         }
                         _self.$fileDomElements[index] = item;
                    }
                });
                filtered = this.$fileDomElements;
                // In case of IE9, get the last element of fileDom and update the id for label
                if(isBrowserIE9OrIE10 && value !== null){
                    // Case: if it is single select, and then we do a restore and then after attaching another file we click save
                    if(_.last(this.$fileDomElements) == null){
                        this.cloneFileInputAndUpdateIdForIE9();
                    } else {
                        this.updateLabelForAttr(_.last(this.$fileDomElements).attr("id"));
                    }
                }
            }
            else {
                // here filtered is a new array
                // A new array is returned over here so that the user of this API doesn't try to change the widget array directly
                filtered = $.map(this.$fileDomElements, function(item, index){
                    var url = _self._getUrl(index);
                    if(!item || url) {
                        return url;
                    } else if((item[0].files && item[0].files.length !== 0)
                            || (_self.options.multiSelect || item[0].value.length > 0)) {
                        return item;
                    }
                });
            }
            return filtered;
        },

        // file preview html
        fileItemPreview: function(){
            return $("<span></span>").addClass("guide-fu-filePreview glyphicon glyphicon-ok");
        },

        // force flag indicates that forcefully set the dom but don't update the options
        buttonText: function (value, force) {
            if (value !== undefined) {
                if(!force)
                    this.options.buttonText = value;
                this.$elementFileUploadBtn.find('span.guide-fu-label').html(value);
            } else {
                return this.options.buttonText;
            }
        },

        // To change the icon of the button, the user should customize the class
        btnIcon: function () {
            return $("<span></span>").addClass("guide-fu-icon glyphicon glyphicon-folder-open");
        },

        btnLabel: function(){
            return $("<span></span>").addClass("guide-fu-label").html(this.options.buttonText);
        },

        fileItemList: function(){
            return this.$parent.find(this.options.fileItemListClass);
        },

        getNewCommentElementSummary : function(text){
            return $("<div title='Click to edit' tabindex='0'></p>").addClass("guide-fu-comment").text(text || _defaults.placeHolderText);
        },

        getNewCommentElement : function(text){
            return $("<div contenteditable='true' tabindex='0'></div>").addClass("guide-fu-comment").text(text || "");
        },

        fileItem: function(fileName, comment, fileUrl){
            var $fileItem = $("<li></li>").addClass("guide-fu-fileItem");
            var nameWithoutMarker = xfalib.ut.Utilities._getNameWithoutMarker(fileName);
            var $elem = $("<span tabindex='0'></span>").addClass("guide-fu-fileName").attr("aria-label", nameWithoutMarker).text(nameWithoutMarker).appendTo($fileItem).keypress(function(e) {
                if (e.keyCode === 13 || e.charCode === 32) {
                    $(e.target).click();
                }
            }).click($.proxy(this.handleFilePreview, this));
            if(this.options.disablePreview) {
               $elem.addClass('non-preview-fileName');
            }
            if(fileUrl != null){
                $elem.attr("data-key", fileUrl);
            }
            $("<span tabindex='0'></span>").addClass("guide-fu-fileClose close").attr("role", "button").attr("aria-label", xfalib.locale.Strings.FileCloseAccessText + nameWithoutMarker).text("x").appendTo($fileItem).keypress(function(e) {
                if (e.keyCode === 13 || e.charCode === 32) {
                    $(e.target).click();
                }
            })
                .click($.proxy(this.handleClick, this));

            this.fileItemPreview().appendTo($fileItem);

            if(this.options.showComment){
                this.getNewCommentElementSummary(comment).appendTo($fileItem).focus($.proxy(this.handleCommentClick, this)).click($.proxy(this.handleCommentClick, this));
            }
            return $fileItem;
        },

        toggleFileUploadBtn: function(){
            if(this.options.multiSelect) {
                // Change the look of file upload button
                if(this.$elementFileList.children().length > 0){
                    // Change the text
                    this.buttonText(this._addFile, true);
                    // Change the icon too
                    this.$elementFileUploadBtn.find('span.guide-fu-icon').removeClass("glyphicon-folder-open").addClass("glyphicon-plus");
                } else {
                    this.buttonText(this.options.buttonText);
                    this.$elementFileUploadBtn.find('span.guide-fu-icon').removeClass("glyphicon-plus").addClass("glyphicon-folder-open");
                }
            }
        },

        showInvalidMessage: function(fileName, invalidFeature){
            var that = this;
            var IS_IPAD = navigator.userAgent.match(/iPad/i) !== null,
                IS_IPHONE = (navigator.userAgent.match(/iPhone/i) !== null);
            if(IS_IPAD || IS_IPHONE){
                setTimeout(function() {
                  that.invalidMessage(that,fileName, invalidFeature);
                }, 0);
            }
            else {
               this.invalidMessage(this,fileName, invalidFeature);
            }
        },

        invalidMessage: function(refObj,fileName, invalidFeature){
            if(invalidFeature === refObj.invalidFeature.SIZE) {
                alert(xfalib.ut.LocalizationUtil.prototype.getLocalizedMessage("", xfalib.locale.Strings["FileSizeGreater"], [fileName, refObj.options.fileSizeLimit]));
            } else if (invalidFeature === refObj.invalidFeature.NAME) {
                alert(xfalib.ut.LocalizationUtil.prototype.getLocalizedMessage("", xfalib.locale.Strings["FileNameInvalid"], [fileName]));
            } else if (invalidFeature === refObj.invalidFeature.MIMETYPE) {
                alert(xfalib.ut.LocalizationUtil.prototype.getLocalizedMessage("", xfalib.locale.Strings["FileMimeTypeInvalid"], [fileName]));
            }
        },

        /***
         * Finds the value in the array, if the value is a url then it uses the filename in the url to search for the text
         * This is done since our model stores the URL too in case of draft restore or clicking on save in guide
         * @param text          string representing the text of which the index is to be found
         * @param $elem         reference to the jquery element. This is used if there are duplicate file names present in the file upload.
         * @returns {number}
         * @private
         */
        _getIndexOfText : function(text, $elem){
            var index = -1,
                self = this,
                isDuplicatePresent = false;
            _.find(this.values, function(value, iter){
                // if value is a url, then compare with last
                var tempValue = value,
                    // can't use getOrElse here since value can have "." in URL and getOrElse splits based on period to find key inside object
                    fileName =  (_.isObject(self._initialFileValueFileNameMap) && typeof self._initialFileValueFileNameMap[value] !== undefined) ? self._initialFileValueFileNameMap[value] : null;
                if(tempValue.match(/\//g) && tempValue.match(/\//g).length > 1){
                    tempValue =  value.substring(value.lastIndexOf("/")+1);
                    tempValue = xfalib.ut.Utilities._getNameWithoutMarker(tempValue);
                }
                // we pass file name explicityly as options, if passed use that as fallback to find the URL
                if(tempValue === text || fileName === text){
                    index = iter;
                    isDuplicatePresent = self.values.indexOf(value, index + 1) !== -1;
                    if($elem && isDuplicatePresent){
                        // now check if duplicate present and get its correct index
                        // today all files are wrapped under .guide-fu-fileItem node
                        index = $elem.closest(".guide-fu-fileItem").index();
                    }
                    // check if there is a duplicate
                    // this is to just break the loop
                    return value;
                }
            });
            return index;
        },


        /*
         * Since input file element might contain multiple files.
         * This function takes absolute file index as parameter & returns position of the file w.r.t input file elt
         */
        _getFileObjIdx : function (index) {
            if (index >= 0) {
                var currentIdx = 0;
                for (var fileInputEltIdx = 0; fileInputEltIdx < this.$fileDomElements.length; fileInputEltIdx++) {
                    if (this.$fileDomElements[fileInputEltIdx]) {
                        var files = this.$fileDomElements[fileInputEltIdx][0].files;
                        if (files) {
                            var filesLength =  files.length;
                            if ( index <= currentIdx + filesLength - 1 ) {
                                return [fileInputEltIdx, index - currentIdx];
                            }
                            currentIdx+=files.length;
                        }
                    } else {
                        if (index == currentIdx) {
                            return [fileInputEltIdx,0];
                        }
                        currentIdx++;
                    }
                }
            }
            return null;
        },

        /*
         * This function returns FileList object of the passed file array
         */
        _getFileListItem : function (files) {
            try {
                var dataContainer = new DataTransfer() || (new ClipboardEvent("")).clipboardData;
                _.each(files, function (file) {
                    dataContainer.items.add(file);
                });
                return dataContainer.files;
            } catch(err) {
                console.error(err);
                throw err;
            }
        },

        _updateFilesInDom : function($fileDom, files) {
            // in safari, a change event is trigged if files property is changed dynamically
            // hence adding this check to clear existing state only for safari browsers
            this._isFileUpdate = true;
            $fileDom[0].files = this._getFileListItem(files);
            this._isFileUpdate = false;
        },

        /*
         * This function deletes files at specified indexes from input dom elt
         */
        _deleteFilesFromInputDom : function ($fileDomElt, deletedIndexes) {
            var remainingFiles = [];
            _.each($fileDomElt[0].files, function(file,idx){
                if(!deletedIndexes.includes(idx)){
                    remainingFiles.push(file);
                }
            });
            try {
                // in safari, a change event is trigged if files property is changed dynamically
                // hence adding this check to clear existing state only for safari browsers
                this._updateFilesInDom($fileDomElt, remainingFiles);
            } catch(err){
                console.error("Deleting files is not supported in your browser");
            }
        },

        /**
         * This event listener gets called on click of close button in file upload
         *
         * @param event
         */
        handleClick: function(event){

            var $elem = $(event.target),
                text = $elem.prev().text(),
                index = this._getIndexOfText(text, $elem),
                url = $elem.prev().data("key"),
                objectUrl = $elem.prev().data("objectUrl");
            if (index != -1) {
                this.values.splice(index, 1);
                var fileObjIdx = this._getFileObjIdx(index);
                var $fileDomElt = this.$fileDomElements[fileObjIdx[0]];
                if (!$fileDomElt || $fileDomElt[0].files.length === 1) {
                    this.$fileDomElements.splice(fileObjIdx[0], 1);
                } else {
                    this._deleteFilesFromInputDom($fileDomElt, [fileObjIdx[1]]);
                }
                if (isBrowserIE9OrIE10) {
                    this.cloneFileInputAndUpdateIdForIE9();
                }
                if (url != null) {
                    // remove the data so that others don't use this url
                    $elem.prev().removeData("key");
                }
                if(objectUrl) {
                    // revoke the object URL to avoid memory leaks in browser
                    // since file is anyways getting deleted, remove the object URL's too
                    window.URL.revokeObjectURL(objectUrl);
                }
            }
            // Remove the dom from view
            //All bound events and jQuery data associated with the element are also removed
            $elem.parent().remove();
            // trigger the change event to update the value
            this.$element.trigger("change.fileupload");
            // Set the focus on file upload button after click of close
            this.$elementFileUploadBtn.focus();

        },


        _previewFileUsingObjectUrl : function (file) {
            if (file) {
                if (window.navigator && window.navigator.msSaveOrOpenBlob) { // for IE
                    window.navigator.msSaveOrOpenBlob(file, file.name);
                } else {
                    var url = window.URL.createObjectURL(file);
                    window.open(url, '', 'scrollbars=no,menubar=no,height=600,width=800,resizable=yes,toolbar=no,status=no');
                    return url;
                }
            }
        },

        // this function maintains a map for
        handleFilePreview: function(event){
            if(!this.options.disablePreview) {
                var $elem = $(event.target),
                    text = $elem.text(),
                    index = this._getIndexOfText(text, $elem),
                    fileDom = null,
                    fileName = null,
                    fileUrl = null,
                    timeStamp = new Date().getTime();

                // for draft usecase, if text contains "/" in it, it means the file is already uploaded
                // text should contain the path, assuming that the fileUrl is stored in data element

                if (index != -1) {
                    // Store the url of file as data
                    if(!_.isUndefined($elem.data("key")))
                        fileUrl = $elem.data("key");

                    if(fileUrl)  {
                        //prepend context path if not already appended
                        if (!(fileUrl.lastIndexOf(this.options._getUrl, 0) === 0)) {
                            fileUrl =  this.options._getUrl + fileUrl;
                        }
                        this.previewFile.apply(this, [null, {"fileUrl" : fileUrl}]);
                    } else {
                        var previewFileObjIdx = this._getFileObjIdx(index);
                        var previewFile = this.$fileDomElements[previewFileObjIdx[0]][0].files[previewFileObjIdx[1]];
                        var objectUrl = this._previewFileUsingObjectUrl(previewFile);
                        if (objectUrl) {
                            $elem.data("objectUrl", objectUrl);
                        }
                    }
                }
            }
        },

        previewFile: function(event){
            var url = null;
            if(_.isUndefined(arguments[1]))
                url = this.$element[this.options.uploaderPluginName]("getFileUrl");
            else
                url = arguments[1].fileUrl;
            var lastIndex = url.lastIndexOf('/');
            //to make sure url has a slash '/'
            // added check for query param since sas url contains query params & does not have file name, encoding is not required in this case
            if(lastIndex >= 0 && url.indexOf('?') == -1) {
                //encode the filename after last slash to ensure the handling of special characters
                url = url.substr(0, lastIndex) +'/'+ encodeURIComponent(url.substr(lastIndex + 1));
            }
            // this would work for dataURl or normal URL
            // todo: add support to preview base 64 encoded image, to preview base64 encoded binary, we would probably need
            // todo: the content type in the widget too
            window.open(url, '', 'scrollbars=no,menubar=no,height=600,width=800,resizable=yes,toolbar=no,status=no');

        },

        resetIfNotMultiSelect: function(){
            if(!this.options.multiSelect){
                // Reset the value and file array
                this.values = [];
                //this.comments = [];
            }
        },

        showFileList: function(fileName, comment, fileUrl){
            if(!this.options.multiSelect || fileName == null || _.isUndefined(fileName)) {
                // if not multiselect, remove all the children of file list
                this.$elementFileList.empty();
            }

            // Add the file item
            // On click of close, remove the element and update the model
            // handle on click of preview button
            if(fileName != null) {
                this.$fileItem = this.$elementFileList.append(this.fileItem(fileName, comment, fileUrl));
            }
        },

        /**
         * Handles the click on comment field
         *
         * TODO: Implement show/hide behaviour instead of replaceWith
         * This may be cause problem during bubble up of event
         *
         * @param event
         */
        handleCommentClick : function(event){
            var $commentElem = null,
                $elem = $(event.target);
            if ($elem.text() === _defaults.placeHolderText) {
                $commentElem = this.getNewCommentElement()
            } else {
                $commentElem = this.getNewCommentElement($(event.target).text());
            }
            $elem.replaceWith($commentElem);
            // register the event again
            if(isBrowserIE9OrIE10){
                $commentElem.focus().focusout($.proxy(this.handleCommentBlur, this));
            } else {
                $commentElem.focus().blur($.proxy(this.handleCommentBlur, this));
            }
        },

        handleCommentBlur : function(event){
            var $commentSummaryElem = null,
                $elem = $(event.target);
            if ($elem.text() === _defaults.placeHolderText) {
                $commentSummaryElem = this.getNewCommentElementSummary();
            } else {
                $commentSummaryElem = this.getNewCommentElementSummary($(event.target).text());
            }
            $elem.replaceWith($commentSummaryElem);
            $commentSummaryElem.focus($.proxy(this.handleCommentClick,this)).click($.proxy(this.handleCommentClick,this));
            // Add a div with the html
            this.$element.trigger("change.fileupload");
        },

        // checks if file name is valid or not to prevent security threats
        isValid : function(fname) {
            var rg1=/^[^\\/:\*\;\$\%\?"<>\|]+$/; // forbidden characters \ / : * ? " < > | ; % $
            var rg2=/^\./; // cannot start with dot (.)
            var rg3=/^(nul|prn|con|lpt[0-9]|com[0-9])(\.|$)/i; // forbidden file names
            return rg1.test(fname) && !rg2.test(fname) && !rg3.test(fname);
        },

        handleChange: function (evnt) {
            if (!this._isFileUpdate) {
                var currFileName = '',
                    inValidSizefileNames = '',
                    inValidNamefileNames = '',
                    inValidMimeTypefileNames = '',
                    $elem = $(evnt.target),
                    files = $elem[0].files;
                // Initially set the invalid flag to false

                // if not multiselect then remove the extra domELement clone
                if (!this.options.multiSelect && this.$fileDomElements.length > 1) {
                    this.$fileDomElements.splice(0, 1)
                }

                var isInvalidSize = false,
                    isInvalidFileName = false,
                    isInvalidMimeType = false;
                this.resetIfNotMultiSelect();
                // Iterate through all the files
                if (isBrowserIE9OrIE10) { // IE9 doesn't support FileList, hence files variable is undefined
                    currFileName = $elem.val().split("\\").pop();
                    //update the last element of array
                    if (this.$fileDomElements.length > 0) {
                        this.$fileDomElements[this.$fileDomElements.length - 1] = $elem;
                    }
                    this.cloneFileInputAndUpdateIdForIE9();

                    // In case of IE9, only do this
                    if (_.isUndefined(files)) {
                        this.showFileList(currFileName);
                        this.values.push(currFileName);
                        // trigger the change event to update the value
                        this.$element.trigger("change.fileupload");
                    }
                }
                if (!_.isUndefined(files)) {
                    var invalidFilesIndexes = [];
                    var validFileNames = [];
                    
                    _.each(files, function (file, fileIndex) {
                        var isCurrentInvalidFileSize = false,
                            isCurrentInvalidFileName = false,
                            isCurrentInvalidMimeType = false;
                        currFileName = file.name.split("\\").pop();
                        // Now size is in MB
                        var size = file.size / 1024 / 1024;
                        // check if file size limit is within limits
                        if ((size > parseFloat(this.options.fileSizeLimit))) {
                            isInvalidSize = isCurrentInvalidFileSize = true;
                            inValidSizefileNames = currFileName + "," + inValidSizefileNames;
                        } else if (!this.isValid(currFileName)) {
                            // check if file names are valid (ie) there are no control characters in file names
                            isInvalidFileName = isCurrentInvalidFileName = true;
                            inValidNamefileNames = currFileName + "," + inValidNamefileNames;
                        } else if (file.type) {
                            var isMatch = this.regexMimeTypeList.some(function (rx) {
                                return rx.test(file.type);
                            });
                            if (!isMatch) {
                                isInvalidMimeType = isCurrentInvalidMimeType = true;
                                inValidMimeTypefileNames = currFileName + "," + inValidMimeTypefileNames;
                            }
                        }

                        // if the file is not invalid, show it and push it to internal array
                        if (!isCurrentInvalidFileSize && !isCurrentInvalidFileName && !isCurrentInvalidMimeType) {
                            this.showFileList(currFileName);
                            // We'll update this.values with the complete URL later
                            validFileNames.push(currFileName);
                        } else {
                            invalidFilesIndexes.push(fileIndex);
                        }

                    }, this);

                    // Handle file upload for valid files
                    if (validFileNames.length > 0) {
                        var fileObject = {
                            fileDom: $elem,
                            fileName: this.options.multiSelect ? validFileNames : validFileNames[0],
                            multiple: this.options.multiSelect,
                            _uuidGenerator: this.options._uuidGenerator,
                            _getUrl: this.options._getUrl
                        };
                        
                        // Upload file and get URL
                        var fileUrl = this.$element[this.options.uploaderPluginName]("uploadFile", fileObject);
                        
                        // Update this.values and set data-key for each valid file
                        if (this.options.multiSelect) {
                            _.each(validFileNames, function(fileName, index) {
                                var $fileNameSpan = this.$elementFileList.find("span.guide-fu-fileName").eq(index);
                                var completeUrl = fileUrl + "/" + fileName;
                                $fileNameSpan.data("key", completeUrl);
                                
                                // If this.values already exists, append to it, otherwise create new array
                                if (_.isArray(this.values)) {
                                    this.values.push(completeUrl);
                                } else {
                                    this.values = [completeUrl];
                                }
                            }, this);
                        } else if (validFileNames.length === 1) {
                            var $fileNameSpan = this.$elementFileList.find("span.guide-fu-fileName").last();
                            $fileNameSpan.data("key", fileUrl);
                            
                            // For single select, replace or create this.values
                            if (!this.options.multiSelect) {
                                this.values = [fileUrl];
                            } else if (_.isArray(this.values)) {
                                this.values.push(fileUrl);
                            } else {
                                this.values = [fileUrl];
                            }
                        }
                    }

                    if (invalidFilesIndexes.length > 0) {
                        var currentFileDomIndex,
                            $currentFileDomElement,
                            filesCount;
                        if (this.$fileDomElements.length > 0) {
                            currentFileDomIndex = this.$fileDomElements.length - 1;
                            $currentFileDomElement = this.$fileDomElements[currentFileDomIndex];
                            if ($currentFileDomElement && $currentFileDomElement.length > 0) {
                                filesCount = $currentFileDomElement[0].files.length;
                                //if all the files are invalid remove the input element as well otherwise only remove the invalid files.
                                if (filesCount === invalidFilesIndexes.length) {
                                    this.$fileDomElements.splice(-1, 1);
                                } else {
                                    this._deleteFilesFromInputDom($currentFileDomElement, invalidFilesIndexes);
                                }
                            }
                        }

                        // in case of IE10, create one extra element
                        if (isBrowserIE9OrIE10) {
                            this.cloneFileInputAndUpdateIdForIE9();
                        }
                    }

                    // trigger the change event to update the value
                    this.$element.trigger("change.fileupload");
                }

                if (isInvalidSize) {
                    this.showInvalidMessage(inValidSizefileNames.substring(0, inValidSizefileNames.lastIndexOf(',')), this.invalidFeature.SIZE);
                } else if (isInvalidFileName) {
                    this.showInvalidMessage(inValidNamefileNames.substring(0, inValidNamefileNames.lastIndexOf(',')), this.invalidFeature.NAME);
                } else if (isInvalidMimeType) {
                    this.showInvalidMessage(inValidMimeTypefileNames.substring(0, inValidMimeTypefileNames.lastIndexOf(',')), this.invalidFeature.MIMETYPE);
                }
            }
        },

        cloneFileInputAndUpdateIdForIE9 : function(){
            var elem = _.last(this.$fileDomElements),
                elemExists = elem != null,
                elemHasValue = elemExists && elem.val().length > 0,
                elemId = null,
                selector = null;

            // CQ-4237903 : create clone to handle the case when user clicks cancel in chrome and for multiselect
            // on clicking cancel in chrome file browser, chrome removes all the files from the input element
            // remove the extra clone in $fileDomElement on handleChange
            if(!elemExists || elemHasValue) {
                elem = this.$element.clone();
                // copy the data attributes
                elem.data(this.$element.data());
                if(isBrowserIE9OrIE10){
                    elemId = this.$element.attr("id") + (++fileLabelsCount);
                    elem.attr("id", elemId);
                    elem.css({
                        'position' : 'absolute',
                        'top' : '-2000px',
                        'left': '-2000px'
                    });
                    elem.appendTo('body');
                    this.updateLabelForAttr(elemId);
                }
                elem.change($.proxy(this.handleChange, this));
                this.$fileDomElements.push(elem);
            }
            // Case: if it is not multiselect and if the first file dom element is null
            // this case would hit when we restore a single select file attachment and attach a new file
            if(!this.options.multiSelect && this.$fileDomElements[0] === null){
                //Splice null out of it, since we are attaching a new file
                this.$fileDomElements.splice(0, 1);
            }
            // if the browser is not IE9, then click it
            if(!isBrowserIE9OrIE10) {
                elem.click();
            }
            return true;
        },

        /**
         * In case of IE9, get the last element of fileDom and update the id for label
         *
         * @param fileInputId
         */
        updateLabelForAttr : function(fileInputId){
            this.$label.attr("for" , fileInputId);
        },

        createLabelForFileInput : function (fileInputId){
            if(isBrowserIE9OrIE10) {
                this.$label = $("<label></label>").addClass("guide-fu-attach-button button")
                        .text(this.options.buttonText)
                        .attr('for',fileInputId);
                this.$elementFileUploadBtn.replaceWith(this.$label);
                this.$label.parent().attr("tabindex", 0).attr("role", "button").attr("aria-label", this.options.screenReaderText || "");
            }
        },


        constructor: function () {
            // Initialize the self instance
            var _self = this,
                isFirst = true;
            //jquery instance of file upload button
            this.$elementFileUploadBtn = this.$parent.find(this.options.buttonClass);
            this.$elementFileUploadBtn.attr("aria-label", this.options.screenReaderText || "");
            if(isBrowserIE9OrIE10){
                this.elementId = this.$element.attr("id");
                this.createLabelForFileInput(this.$element.attr("id"));
            }

            // html for file list
            this.$elementFileList = $(this.fileItemList());
            // Initialize the value and file(Refer FileList class mdn)
            this.values = [];
            this._initialFileValueFileNameMap = {};
            // List of dom elements of input type file
            this.$fileDomElements = [];

            var flag = false,
                $currElem = null;

            $(document).mousedown(function(e) {
                $currElem = $(e.target);
            });
            // Enter key should result in click of button
            this.$elementFileUploadBtn
                .focus(function(){
                    _self.$element.trigger("focus.fileupload");
                })
                .click($.proxy(this.cloneFileInputAndUpdateIdForIE9, this))
                .blur(function(event){
                    // Check if the currElem does not belong to the fileItemList
                    if(!flag && $currElem!= null && $currElem.closest(".guide-fu-fileItemList").length <=0){
                        _self.$element.trigger("focusout.fileupload");
                    }
                    flag = false;
                });
            //Initialize the filePreview Plugin
            this.$element[this.options.uploaderPluginName]({
                iframeContainer: this.options.iframeContainer,
                _filePath: this.options._filePath,
                _uuidGenerator: this.options._uuidGenerator,
                _getUrl: this.options._getUrl

            });
            // Getting input file value
            // listening on fileuploaded event
            this.$element.change($.proxy(this.handleChange, this));
                //.on("adobeFileUploader.fileUploaded", $.proxy(this.previewFile, this));
        }
    };

    $.fn.customFileAttachment = function (option, value) {
        var get = '',
            element = this.each(function () {
                // in case of input type file
                if ($(this).attr('type') === 'file') {
                    var $this = $(this),
                        data = $this.data('customFileAttachment'),
                        options = $.extend({}, CustomFileAttachment.prototype.defaults, typeof option === 'object' && option);

                    // Save the custom file attachment data in jquery
                    if (!data) {
                        $this.data('customFileAttachment', (data = new CustomFileAttachment(this, options)));
                        data.constructor();
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

    // fileSizeLimit is in MB, default value is 2MB
    CustomFileAttachment.prototype.defaults = {
        'buttonText': 'Attach',
        'multiSelect': false,
        'fileSizeLimit': 2,
        'uploaderPluginName': "customFileUploader",
        'mimeType' : ['audio/*', 'video/*', 'image/*', 'text/*', 'application/pdf']
    };

})($, window, window._);