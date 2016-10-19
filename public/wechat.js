/**
 * 动微信分享
 */
(function(global, factory) {
    if ( typeof define === "function") {
        if(define.amd) {
            define(function() {
                return factory();
            });
        } else if(define.cmd) {
            define(function(require, exports, module) {
                module.exports = factory();
            });
        }
    } else if( typeof module === "object" && typeof module.exports === "object" ) {
        module.exports = factory();
    } else {
        global.Qwechat = factory();
    }
}(typeof window !== "undefined" ? window : this, function() {

    var URL_WX_API_JS = 'http://res.wx.qq.com/open/js/jweixin-1.0.0.js',
        _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
        G_WX_JSAPI = [
            'checkJsApi', 'onMenuShareTimeline', 'onMenuShareAppMessage', 'onMenuShareQQ',
            'onMenuShareWeibo', 'hideMenuItems', 'showMenuItems'
        ],
        // 配置签名相关的参数
        URL_Q_SIGNATURE = '',   // 获取签名的服务端地址
        // api 的加载状态
        API_STATE_LOADING = 1,
        API_STATE_LOADED = 2,
        apiLoadState = 0,
        // 缓存回调函数
        callbackList = [];

    // 初始化
    function initWechat (callback) {
        // 加载脚本
        loadScript(URL_WX_API_JS, function() {
            // 获取微信签名
            getSignature(function(sign) {
                // 验证微信授权
                wx.config({
                    debug: false, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
                    appId: sign.appId, // 必填，公众号的唯一标识
                    timestamp: sign.timestamp, // 必填，生成签名的时间戳
                    nonceStr: sign.nonceStr, // 必填，生成签名的随机串
                    signature: sign.signature, // 必填，签名，见附录1
                    jsApiList: G_WX_JSAPI // 必填，需要使用的JS接口列表，所有JS接口列表见附录2
                });
                // 授权验证通过
                wx.ready(function() {
                    callback();
                });
                // 授权错误
                wx.error(function(res) {
                    console.error('授权错误');
                    console.error(res);
                });
            });
        });
    }

    /**
     * 动态加载 js 脚本
     * @param  {[type]}   url      [description]
     * @param  {Function} callback [description]
     * @return {[type]}            [description]
     */
    function loadScript(url, callback) {
        var head = document.getElementsByTagName('head')[0],
            js = document.createElement('script');
        js.setAttribute('type', 'text/javascript');
        js.setAttribute('src', url);
        head.appendChild(js);
        //执行回调
        js.onload = function() {
            if (typeof callback === 'function') {
                callback();
            }
        }
    }

    /**
     * 获取签名
     * @param  {[type]} arguments [description]
     * @return {[type]}           [description]
     */
    function getSignature (callback) {
        var currentPageUrl = window.location.href.split('#')[0],
            params = {
                activityUrl: base64_encode(currentPageUrl)
            };
        $.post(URL_Q_SIGNATURE, params, function(resp) {
            if (typeof resp === 'object' && resp.status === 0 && 
                typeof resp.data === 'object'
            ) {
                if(typeof callback === 'function') {
                    callback(resp.data);
                }
            } else {
                console.error("微信签名请求出错！");
            }
        });
    }

    function base64_encode(input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
        input = _utf8_encode(input);
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            output = output +
                _keyStr.charAt(enc1) + _keyStr.charAt(enc2) +
                _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
        }
        return output;
    }

    function _utf8_encode(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    }

    return {
        ready: function(fn) {
            if (typeof fn !== 'function') {
                console.error('Qwechat.ready(fn) error, fn param is invalid!');
                return;
            }
            if (apiLoadState === API_STATE_LOADED) {
                // api 已经加载完了， 直接回调即可
                fn(wx);
            } else if (apiLoadState === API_STATE_LOADING) {
                // api 还在准备中， 先缓存回调函数
                callbackList.push(fn);
            } else {
                // api 还没有加载，先缓存回调函数
                callbackList.push(fn);
                // 设置当前状态为加载中
                apiLoadState = API_STATE_LOADING;
                // 执行初始化函数
                initWechat(function() {
                    // 设置当前状态为已加载
                    apiLoadState = API_STATE_LOADED;
                    // 初始化完成， 执行回调队列中缓存的所有函数
                    var callback = null;
                    while((callback = callbackList.shift())) {
                        callback(wx);
                    }
                });

            }
        }
    };
}));