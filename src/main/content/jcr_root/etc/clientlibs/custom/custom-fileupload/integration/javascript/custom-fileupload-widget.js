(function($) {
    /*
     * As a sample the class is extending from textField, choose the required class to extend from (based on requirement):
     * - $.xfaWidget.abstractWidget: This is the parent of all the other widgets, and should be used only when any
     *                                specific widget below is not applicable.
     * - $.xfaWidget.defaultWidget: This widget extends from Abstract widget and provides the default implementation for
     *                               render, getOptionsMap and getCommitValue.
     * - $.xfaWidget.dateTimeEdit: This is Out-of-the-box widget for Date Picker.
     * - $.xfaWidget.dropDownList: This is Out-of-the-box widget for Drop-down list.
     * - $.xfaWidget.listBoxWidget: This is Out-of-the-box widget for List box (Drop-down
     *                              list with multi-select enabled).
     * - $.xfaWidget.numericInput: This is Out-of-the-box widget for Numeric fields.
     * - $.xfaWidget.signatureField: This is Out-of-the-box widget for Signature fields.
     * - $.xfaWidget.textField: This is Out-of-the-box widget for Text fields.
     * - $.xfaWidget.xfaButton: This is Out-of-the-box widget for buttons.
     * - $.xfaWidget.XfaCheckBox: This is Out-of-the-box widget for Check box and radio buttons fields.
     */

    var xfaUtil = xfalib.ut.XfaUtil.prototype;
    $.widget("xfaWidget.customfileupload", $.xfaWidget.abstractWidget, {

        _widgetName:"customfileupload",
        _superPrototype : $.xfaWidget.abstractWidget.prototype,
        getOptionsMap: function(){
            var parentOptionsMap = this._superPrototype.getOptionsMap.apply(this,arguments),
                newMap = $.extend({},parentOptionsMap, $.extend({}, this.options, {
                    "value" : function(value) {
                        this.$userControl.customFileAttachment("value", value);
                    },
                    "fileList": function(value){
                        this.$userControl.customFileAttachment("fileList", value);
                    },
                    "comment" : function(value){
                        this.$userControl.customFileAttachment("comment", value);
                    },
                    // "access" can be either open or readonly
                    "access" : function(value){
                        this.$userControl.customFileAttachment("access", value);
                    }

                }));

            return newMap;

        },
        // TODO: Will need to remove this functions
        //  will be tracked by LC-391200

        _initializeOptions: function () {
            _.each(this.optionsHandler, function (value, key) {
                // overriding the behaviour of _initializeOptions
                // only for _uuidGenerator
                // as we font want getUUID to be called at render time
                if (typeof value === "function" && key !== '_uuidGenerator' ) {
                        value.apply(this, [this.options[key]])
                }
            }, this)
        },

        _getFileList: function(){
            return this.$userControl.customFileAttachment("fileList");
        },

        _getComment: function(){
            return this.$userControl.customFileAttachment("comment");
        },
        _getFileNamePathMap: function (pathList) {
            return this.$userControl.customFileAttachment("getSetFilePathAndReturnNamePathMap", pathList);
        },
        getEventMap: function() {
            var parentEventMap = this._superPrototype.getEventMap.apply(this, arguments),
                newMap = $.extend({}, parentEventMap,
                    {
                        "change" : null,
                        "focusout.fileupload" : xfaUtil.XFA_EXIT_EVENT,
                        "focus.fileupload" : xfaUtil.XFA_ENTER_EVENT,
                        "change.fileupload" : xfaUtil.XFA_CHANGE_EVENT
                    });
            return newMap;
        },
        render: function() {
            var $el = this._superPrototype.render.apply(this,arguments);
            $el.customFileAttachment(this.getOptionsMap());
            return $el;
        },
        showDisplayValue: function() {
             //since value can't be set in file element input, leaving this fn empty
        },
        showValue: function() {
            //since value can't be set in file element input, leaving this fn empty
        },
        getCommitValue: function() {
            this.options.fileList = this._getFileList();
            this.options.comment = this._getComment();
            return this.$userControl.customFileAttachment("value");
        }
    });
})(jQuery);
