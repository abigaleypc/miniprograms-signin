## 微信小程序登录态与敏感信息获取功能

> 转载请注明出处 (｡･∀･)ﾉﾞ

### client

* 在使用微信web开发者工具中，在左边菜单选择“项目”--勾选“开发环境不校验域名、TLS版本以及HTTPS证书”

### server

* 进入`server`文件夹
* 启动redis服务：redis-server
* 启动nodejs: npm start

### 详见

微信小程序有一套严格且小复杂的登录方案，为了疏通整个登录流程，我花了好几天的时间画图与测试，终于~~

流程如下：
![微信小程序登录流程](/images/signin.png)

### 登录态的作用

* 检测登录是否过期
* 通过调用微信登陆接口获取登录凭证，进而获取敏感信息

### 步骤

1.	微信小程序(前端，以下统称前端) `wx.checkSession()` 是每次进入微信小程序时最先调用的接口，因为微信小程序的登录具有时效性，该内置函数式为了检测登录是否过期了。

```js
	wx.checkSession({
	  success: function(){
	    // 登录态未过期，可进行我们所需要的业务
	  },
	  fail: function(){
	    wx.login() // 登录态已过期，需重新登录
	  }
	})
```

[具体用法](https://mp.weixin.qq.com/debug/wxadoc/dev/api/api-login.html#wxchecksessionobject)

2.	如果我们是第一次登录，或者登录态已经过期，则前端调用 `wx.login()` ，该函数将返回一个用户凭证 `code`,如 `{code:'7rheuw93her0239urhf'}`。

```js
  wx.login({
    success: function(res) {
      console.log(res.code); // '7rheuw93her0239urhf'
    }
  });
```

3.	我们需要自己启动一个后端，即流程图中的 `第三方服务器` ，将以上获取到的 `code` 传至第三方服务器

* 前端代码示例：

```js
  wx.login({
    success: function (res) {
      wx.request({
        url: 'https://XXXX.com:8080/api/authorization', // 这个接口写于后端，用于向微信服务器 换取 session_key 和 openId 的接口
        data: {
          code: res.code // 将wx.login()返回 code 传至第三方服务器
        },
        header: {
          'content-type': 'application/json'
        },
        success: function (res) {
          // 发送成功
        }
      })
    }
  })
```

* 该接口 `https://XXXX.com:8080/api/authorization` 调用微信服务器接口 'jscode2session'获取用户唯一标识openid和会话密钥session_key
* 该接口调用微信服务器接口：`https://api.weixin.qq.com/sns/jscode2session` ，所需参数和返回字段如下：

* 请求所需字段
  * appid: 小程序的唯一标识
  * secret: 小程序的app secret
  * js_code: 以上提到很多次的 `code`
  * grant_type: 均为 `authorization_code `

* 返回字段
  * openid: 用户的唯一标识
  * session_key: 登录的会话密钥
  * expires_in: 有效时间


> 由于我测试的项目后端语言采用node实现，所以该文章所有后端代码均是node示例。

后端代码示例：

```js
  router.get('/authorization', function (req, res, next) {
    // 获取session_key expires_in openid 

    request.get({
      uri: 'https://api.weixin.qq.com/sns/jscode2session',
      json: true,
      qs: {
        grant_type: 'authorization_code',
        appid: appId,
        secret: appSecret,
        js_code: req.query.code
      }
    }, (err, response, data) => {
      if (response.statusCode === 200) {
          data.openid // 用户唯一标识
          data.session_key // 会话密钥
          data.expires_in // 有效时间
      } else {
        res.json(err)
      }
    })
  })
```

4.	生成第三方session，根据微信小程序官方的建议：用于第三方服务器和小程序之间做登录态校验，为了保证安全性，3rd_session应该满足：
* 足够长。建议有 2^128 组合
* 避免使用 srand(当前时间)，然后 rand() 的方法，而是采用操作系统提供的真正随机数机制
* 设置一定的有效时间

	生成3rd_session的方法有很多种，我们暂且跳过这一步骤，就假设 `3rd_session='6c22c620b4fJE2878fc8f10b5ba2ffe'` (当然3rd_session是数字开头不能作为变量名，代码中为 `secret.SECRET`)，根据 `code` 获取 `session_key` 和 `openId` ,再将它们存在内存中。以`3rd_session`为key，`session_key` 和 `openId` 为value存储。
	 
* 我采用的方式是将 `session_key` 和 `openId` 写为json格式，再将该json格式转为string，
假设转为string格式后为 `'{session_key:001, openId:002}'`，然后再将它作为value，`3rd_session`为key ，存入内存中。

* 将 `3rd_session` 返回给前端，前端需要将它存在storage，第三方服务器也需要将 `{3rd_session:session_key+openid}` 存在内存中。

* 如何存在内存？可以 `npm install redis --save`，然后 
`
	const redis = require('redis');
	redisStore = redis.createClient();
`
	将其引入，Redis 是内存中的数据结构存储系统，我们可以将3rd_session存下来
	
* 最后封装好我们的第三方session之后，就这个3rd_session返回到前端
	
后端代码示例：
	
```js
	router.get('/authorization', function (req, res, next) {
	  // 获取session_key expires_in openid 
	
	  request.get({
	    uri: 'https://api.weixin.qq.com/sns/jscode2session',
	    json: true,
	    qs: {
	      grant_type: 'authorization_code',
	      appid: appId,
	      secret: appSecret,
	      js_code: req.query.code
	    }
	  }, (err, response, data) => {
	    if (response.statusCode === 200) {
	      //TODO: 生成一个唯一字符串sessionid作为键，将openid和session_key作为值，存入redis，超时时间设置为2小时
	      let secretValue = {
	        openid: data.openid,
	        session_key: data.session_key
	      }
	      
	      // 将{secret.SECRET:JSON.stringify(secretValue)} 存入内存中，过期时间设置为微信小程序接口返回给我们的有效时间
	      redisStore.set(secret.SECRET, JSON.stringify(secretValue), 'EX', data.expires_in);
	    } else {
	      res.json(err)
	    }
	  })
	  
	  // 返回给前端
	  res.send({
	    wxtoken: secret.SECRET
	  })
	})
```

5.	这时候我们前端已经收到 `3rd_session`，需要将它存在Storage中，采用微信小程序内置函数 [wx.setStorage()](https://mp.weixin.qq.com/debug/wxadoc/dev/api/data.html#wxsetstorageobject) 存储。

```js
	// 伪代码
	wx.setStorage({
	  key:"3rd_session",
	  data: 3rd_session
	})
```
	
	至此，我们获取密钥生成 `3rd_session` 的过程就结束了。但有何用呢？`3rd_session` 是为了每次做请求时做用户验证，比如用户想做一些只有用户本人才能做的操作，不需要每次都去问微信服务端 `是本人才操作` 吗，在有效时间内我们问自己的服务端就行，这个有效时间微信服务端已返回，即 `expires_in` 。
	
	接下来我们带上 `3rd_session` 去做一些只有本人才能做的操作，比如获取个人敏感信息。
	
6.	获取用户信息，当只需要获取用户个人基本信息时，不需要与第三方服务器做交互，只需要调用如下接口：
 
```js
	wx.getUserInfo({
	  success: function(res) {
	  	// 返回用户基本信息如下res
	  }
	})
	
	res:
	{
		userInfo: '',
		nickName: 'Abigale',
		avatarUrl: 'https://xxx.com/xx.png',
		userInfo: '',
		gender: 2,
		province: '',
		city: '',
		country: '',
	}
```
	
但当我们需要获取个人的敏感信息时，需要将请求参数 `withCredentials` 设为 `true`，默认该值为 `false`，该字段意为是否带上登录态信息	。
	
```js
	wx.getUserInfo({
	  success: function(res) {
	  	withCredentials: true, // 设为 true
	  	// 返回带敏感信息的个人信息如下res
	  }
	 })
	 
	res:
  	{
  		errMsg: "getUserInfo:ok", 
  		rawData: "{"nickName":"Abigale","gender":2,"language":"zh_CN"}",
  		userInfo: Object, 
  		signature: "xxxx", 
  		encryptedData: "xxx",
  		errMsg: "getUserInfo:ok",
  		userInfo: "",
  		avatarUrl: "https://xxx.com/xx.png",
  		iv: "re3dw",
  		userInfo: {
			nickName: 'Abigale',
			avatarUrl: 'https://xxx.com/xx.png',
			userInfo: '',
			gender: 2,
			province: '',
			city: '',
			country: '',
		}
  	}
```
	
	以上敏感信息加密算法可参考：[用户数据的签名验证和加密](https://mp.weixin.qq.com/debug/wxadoc/dev/api/signature.html)
	
7.	前端带着以上个人敏感信息和 `3rd_session` 向第三方服务器发起请求，目的是解密获取个人敏感信息
	* 首先第三方服务器根据 `3rd_session` ，在内存中取出 `session_key`，因内存中我们是采用 ` JSON.stringify(secretValue)` 将`session_key`和 `openid` 存起来的，所以取出的时候我们可以采用 `JSON.parse(secretValue)`。
	* 根据 `config.appId` , `session_key` , `encryptedData` , `iv` 对数据进行解密
	* 敏感信息解密算法可参考：[用户数据的签名验证和解密](https://mp.weixin.qq.com/debug/wxadoc/dev/api/signature.html)

8.	解密后的信息如下

```json
	{
	    "openId": "OPENID",
	    "nickName": "NICKNAME",
	    "gender": GENDER,
	    "city": "CITY",
	    "province": "PROVINCE",
	    "country": "COUNTRY",
	    "avatarUrl": "AVATARURL",
	    "unionId": "UNIONID",
	    "watermark":
	    {
	        "appid":"APPID",
	        "timestamp":TIMESTAMP
	    }
	}
```
	 
至此，获取敏感信息步骤也完成啦啦♪(^∇^*)


### 我所遇到的疑惑

* 为什么微信小程序已经有登录检测，过期时会弹出窗口让用户去点击"允许"去登录，为什么还是需要我们通过 `wx.checkSession()` 去检测是否登录过期进而去调用 `wx.login()` 呢？
	* 因为调用 `wx.login()` 是为了获取登录凭证，当这个登录凭证在有效期内，就不需要跑去微信服务器问本人登录是否过期了




