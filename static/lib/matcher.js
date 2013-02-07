UT.beforeEach(function () {
    var uiMatchers = {
        toHaveClass:function (className) {
            var nodeList = jQuery(this.actual);
            return nodeList.hasClass(className);

        },
        toBeVisible:function () {
            var nodeList = jQuery(this.actual);
            if(nodeList.size() ==0) return false;
            return nodeList.size() == nodeList.filter(':visible').size();
        },

        toBeHidden:function () {

            var nodeList = jQuery(this.actual);
            if(nodeList.size() ==0) return false;
            return nodeList.size() == nodeList.filter(':hidden').size();
        },

        toBeSelected:function () {
            var nodeList = jQuery(this.actual);
            if(nodeList.size() ==0) return false;
            return nodeList.filter(':selected').size() == nodeList.size();
        },

        toBeChecked:function () {

            var nodeList = jQuery(this.actual);
            if(nodeList.size() ==0) return false;
            return nodeList.filter(':checked').size() == nodeList.size();
        },

        toBeEmpty:function () {
            var nodeList = jQuery(this.actual);
            if(nodeList.size() ==0) return false;
            return nodeList.filter(':empty').size() == nodeList.size();

        },

        toExist:function () {
            var nodeList = jQuery(this.actual);
            return nodeList.size();
        },

        toHaveAttr:function (attributeName, expectedAttributeValue) {
            var nodeList = jQuery(this.actual);
            if(nodeList.length==0)return false;
            var result = true;

            jQuery.each(nodeList, function (index, item) {
                if (jQuery(item).attr(attributeName) != expectedAttributeValue) {
                    result = false;
                    return false;
                }
            })
            /*for(var i = 0;nodeList[i];i++){
             if(nodeList.item(i).attr(attributeName) != expectedAttributeValue ) {
             result = false;
             break;
             }
             }*/
            return result;

        },

        toHaveProp:function (propertyName, expectedPropertyValue) {
            var nodeList = jQuery(this.actual);
            var result = true;
            jQuery.each(nodeList, function (index, item) {
                if (jQuery(item).prop(propertyName) != expectedPropertyValue) {
                    result = false;
                    return false;
                }
            })
            /*for(var i = 0;nodeList[i];i++){
             if(nodeList.item(i).prop(propertyName) != expectedPropertyValue ) {
             result = false;
             break;
             }
             }*/
            return result;

        },

        toHaveId:function (id) {
            var nodeList = jQuery(this.actual);
            return nodeList.attr('id') == id;
        },

        toHaveHtml:function (html) {
            var nodeList = jQuery(this.actual);
            return jQuery.trim(nodeList.html()) == jQuery.trim(html);
        },
        toContainHtml:function (html) {
            var nodeList = jQuery(this.actual).first();
            var allHtml = nodeList.html()||"";

            return allHtml.indexOf(html)!=-1;
        },

        toHaveSameSubTree:function (html) {
            var nodeList = jQuery(this.actual);
            var root = nodeList[0];
            if (!root) {
                return false;
            }


            function serializeHTML(node, arr) {

                if (node.nodeType == '1') {
                    arr.push(node.tagName);
                    var childs = node.childNodes;

                    var tagChilds = [];
                    for (var i = 0; childs[i]; i++) {
                        if (childs[i].nodeType == 1) {
                            tagChilds.push(childs[i]);
                        }
                    }
                    if (tagChilds.length) {
                        arr.push('>');
                    }

                    for (var i = 0; tagChilds[i]; i++) {
                        serializeHTML(tagChilds[i], arr);
                        if (i < tagChilds.length - 1) {
                            arr.push('+');
                        }
                    }
                }
                return;
            }

            var temp = jQuery('<div style="display: none;" id="tempHtmlStructure"></div>');
            temp[0].innerHTML = html;
            jQuery('body').append(temp);
            var expectRecord = [];


            serializeHTML(jQuery('#tempHtmlStructure')[0], expectRecord);
            temp.remove();
            expectRecord.shift();
            var expectStr = expectRecord.join('');
            var actualRecord = [];
            serializeHTML(root, actualRecord);
            actualRecord.shift();
            var actualStr = actualRecord.join("");
            return  actualStr == expectStr;

        },

        toHaveText:function (text) {
            var nodeList = jQuery(this.actual);
            var trimmedText = jQuery.trim(nodeList.text());
            if (text && jQuery.isFunction(text.test)) {
                return text.test(trimmedText);
            } else {
                return trimmedText == text;
            }
        },
        toContainText:function (text) {
            var nodeList = jQuery(this.actual);
            var trimmedText = jQuery.trim(nodeList.text())||"";

            return trimmedText.indexOf(text)!=-1;
        },

        toHaveValue:function (value) {
            var nodeList = jQuery(this.actual);
            var result = true;
            jQuery.each(nodeList, function (index, item) {
                if (jQuery(item).val() !== value) {
                    result = false;
                    return false;
                }
            })


            return result;


        },
        toHaveChildren:function (selector, num) {
            return jQuery(this.actual).children(selector).length==num;
        },


        toBeDisabled:function (selector) {
            var nodeList = jQuery(this.actual);
            if(nodeList.size() ==0) return false;
            return nodeList.filter(':disabled').size() == nodeList.size();
        },

        toBeFocused:function (selector) {
            var nodeList = jQuery(this.actual);
            if(nodeList.size() ==0) return false;

            return nodeList.filter(':focus').size() == nodeList.size();
        },

        toHaveComputedStyle:function (styleProp, expectValue) {

            if (styleProp.match(/color/i)) {
                var tempNode = $('<div></div>');
                $('body').append(tempNode);
                $(tempNode).css(styleProp, expectValue);
                expectValue = $(tempNode).css(styleProp);
                tempNode.remove();
            }

            return jQuery(this.actual).first().css(styleProp) === expectValue;


        },
        toHaveCSS:function (styleProp, expectValue) {
            if (styleProp.match(/color/i)) {
                var tempNode = $('<div></div>');
                $('body').append(tempNode);
                $(tempNode).css(styleProp, expectValue);
                expectValue = $(tempNode).css(styleProp);
                tempNode.remove();
            }
            return jQuery(this.actual).first().css(styleProp) === expectValue;


        },

        atPosition:function (x, y, off, relativeEl) {
            var tempOff = 0.1;
            var absX = Math.abs(x);
            var absY = Math.abs(y);
            var referPosition = {top:0, left:0};
            if (arguments[2] && typeof arguments[2] == 'number') {
                tempOff = arguments[2];
            }

            if (arguments[3] && typeof arguments[3] == 'string') {
                var referEl = jQuery(arguments[3]);
                if (referEl) {
                    referPosition = referEl.offset();
                }


            }
            var nodeList = jQuery(this.actual);
            var actualPosition = nodeList.offset();
            var heightGap = nodeList.outerHeight() * tempOff;
            var widthGap = nodeList.outerWidth() * tempOff;
            return (Math.abs(Math.abs(actualPosition.top - referPosition.top) - absY) < heightGap) && ( Math.abs(Math.abs(actualPosition.left - referPosition.left) - absX) < widthGap);
        }




    };
    this.addMatchers(uiMatchers);


});