/**
 * 微信
 *   服务端授权接口
 */
var Promise = require('promise');
var https = require('https');
var querystring = require('querystring');
var crypto = require('crypto');
// 在单台服务器的情况下，在内存中缓存 access_token 和 jsapi_ticket
// 如果是多台服务器，建议使用 redis 缓存
var cache_access_token = '';
var cache_jsapi_ticket = '';
// 微信公众平台测试账号
// 申请地址 http://mp.weixin.qq.com/debug/cgi-bin/sandbox?t=sandbox/login
var appid = '';   // 微信平台 app id
var secret = '';  // 微信平台 app 加密串
// 生成随机字符串
var nonstr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/*@Controller*/
module.exports = {
  
  /*@Qmonitor("MP_verify_1Dzk5461NaRaimIi")*/
  /*@RequestMapping({url: "/activity/MP_verify_ofjOR1yIIOXOXoTp.txt"})*/
  serverConfigFile: function(req, res) {
    res.setHeader('Content-Type', 'text/plain');
    res.end('ofjOR1yIIOXOXoTp');
  },

  /*@RequestMapping({url: "/activity/accesstoken"})*/
  getWechatjsConfig: function(req, res) {
    var allUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    var url = allUrl.split('#')[0];
    getAccessToken()
      .then(function(token) {
        // 使用 access_token 去获取 jsapi_ticket
        return getJsapiTicket(token);
      })
      .then(function(jsapiTicket) {
        // 生成随机串
        var noncestr = genNoncestr();
        // 生成时间戳
        var timestamp = new Date().getTime();
        // 计算签名
        var signature = compSignature(jsapiTicket, noncestr, timestamp, url);
        // 返回结果
        res.setHeader('Content-Type', 'application/json;charset=utf-8');
        res.end(JSON.stringify({
          appId: appid,
          timestamp: timestamp,
          nonceStr: noncestr,
          signature: signature
        }));
      })
      .catch(function(e) {
        res.setHeader('Content-Type', 'application/json;charset=utf-8');
        res.end(JSON.stringify({
          status: 1,
          message: e
        }));
      });
  }

}

/**
 * 缓存，这里模拟 redis 
 * @param  {[type]} key [description]
 * @return {[type]}     [description]
 */
function getAccessToken () {
  if (cache_access_token) {
    return Promise.resolve(cache_access_token);
  }
  return new Promise(function(resolve, reject) {
    var params = querystring.stringify({
      grant_type: 'client_credential',
      appid: appid,
      secret: secret
    });
    sendHttpsRequest({
      host: 'api.weixin.qq.com',
      port: 443,
      method: 'GET',
      path: '/cgi-bin/token?' + params
    })
    .then(function(resp) {
      // 设置缓存在指定时间后过期
      // ****** 如果是多台服务器，这里应该替换为 redis ******
      cache_access_token = resp.access_token;
      var expires = isNaN(resp.expires_in) ? 0 : resp.expires_in * 1000;
      if (expires === 0) {
        var errStr = '访问微信接口错误，get jsapi tikect error, expires is not a number!';
        console.error(errStr);
        reject(errStr);
      }
      setTimeout(function() {
        cache_access_token = '';
      }, expires);
      // 返回结果
      resolve(cache_access_token);
    })
    .catch(function(e) {
      reject(e);
    });
  });
}

/**
 * 获取 jsapi ticket
 * @return {[type]} [description]
 */
function getJsapiTicket (accessToken) {
  if (cache_jsapi_ticket) {
    return Promise.resolve(cache_jsapi_ticket);
  }
  return new Promise(function(resolve, reject) {
    var params = 'appid=' + appid + '&secret=' + secret;
    var params = querystring.stringify({
      type: 'jsapi',
      access_token: accessToken
    });
    sendHttpsRequest({
      host: 'api.weixin.qq.com',
      port: 443,
      method: 'GET',
      path: '/cgi-bin/ticket/getticket?' + params
    })
    .then(function(resp) {
      // 设置缓存在指定时间后过期
      // ****** 如果是多台服务器，这里应该替换为 redis ******
      cache_jsapi_ticket = resp.ticket;
      var expires = isNaN(resp.expires_in) ? 0 : resp.expires_in * 1000;
      if (expires === 0) {
        var errStr = '访问微信接口错误，get jsapi tikect error, expires is not a number!';
        console.error(errStr);
        reject(errStr);
      }
      setTimeout(function() {
        cache_jsapi_ticket = '';
      }, expires);
      // 返回结果
      resolve(cache_jsapi_ticket);
    })
    .catch(function(e) {
      reject(e);
    });
  });
}

/**
 * 发送请求
 * @param  {[type]} options [description]
 * @return {[type]}         [description]
 */
function sendHttpsRequest (options) {
  return new Promise(function(resolve, reject) {
    var data = '';
    var reqHttps = https.request(options, function(response) {
      response.on('data', function(chunk) {
        data += chunk;
      }).on('end', function() {
        resolve(JSON.parse(data));
      });
    });

    reqHttps.on('error', function(e) {
      console.log(e);
      reject(e);
    });

    reqHttps.end();
  });
}

/**
 * 获取随机字符串
 * @return {[type]} [description]
 */
function genNoncestr () {
  var length = 16;
  var arr = [];
  var randomNumber = 0;
  while(length > arr.length) {
    randomNumber = parseInt(Math.random() * nonstr.length, 10) + 1;
    arr.push(nonstr[randomNumber]);
  }
  return arr.join('');
}

/**
 * 计算签名
 * @param  {[type]} jsapiTicket [description]
 * @param  {[type]} noncestr    [description]
 * @param  {[type]} timestamp   [description]
 * @param  {[type]} url         [description]
 * @return {[type]}             [description]
 */
function compSignature(jsapiTicket, noncestr, timestamp, url) {
  var str = [
    'jsapi_ticket=', jsapiTicket, 
    '&noncestr=', noncestr, 
    '&timestamp=', timestamp, 
    '&url=', url
  ].join('');
  return sha1(str);
}

/**
 * sha1 加密
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
function sha1(data) {
  var generator = crypto.createHash('sha1');
  generator.update(data);
  return generator.digest('hex') 
}