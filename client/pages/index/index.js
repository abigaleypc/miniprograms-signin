//index.js
//获取应用实例
var app = getApp()
Page({
  data: {
    motto: 'Hello World',
    userInfo: {},
    curIndex: 0,
    userCode: null

  },
  //事件处理函数
  bindViewTap: function () {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onLoad: function () {
    console.log('onLoad')
    var that = this
    //调用应用实例的方法获取全局数据
    app.getUserInfo(function (userInfo) {
      //更新数据
      that.setData({
        userInfo: userInfo,
        lastStep: ''
      })
    })


  },
  onReady: function () {
  },

  checkWxSession: function (success, fail) {
    wx.checkSession({
      success: function () {
        success();
      },
      fail: function () {
        //登录态过期
        fail(success);
      }
    })
  },
  wxlogin: function (callback) {
    var that = this;
    // 登录之后获取token 
    wx.login({
      success: function (res) {
        that.setData({
          userCode: res.code
        })
        wx.request({
          url: 'https://127.0.0.1:8444/api/authorization',
          data: {
            code: res.code
          },
          header: {
            'content-type': 'application/json'
          },
          success: function (res) {
            console.log('生成第三方session,获取wxtoken');
            wx.setStorage({
              key: 'wxtoken',
              data: res.data.wxtoken
            })
            callback();
          }
        })
      }
    })
  },
  handleEvent: function () {
    console.log('正式处理问题');
  },
  login: function () {
    var that = this;

    wx.getStorage({
      key: 'wxtoken',
      success: function (res) {
        that.checkWxSession(that.handleEvent, that.wxlogin);
      },
      fail: function () {
        that.wxlogin(that.handleEvent);

      }
    })

    //清除wxtoken
    // wx.setStorage({
    //   key: 'wxtoken',
    //   data: ''
    // })






  },
  getEncryptData: function (callback) {
    wx.getStorage({
      key: 'wxtoken',
      success: function (token) {
        wx.getUserInfo({
          withCredentials: true,
          success: function (res) {
            wx.request({
              url: 'https://127.0.0.1:8444/api/encryptData',
              data: {
                token:token.data,
                encryptedData: res.encryptedData,
                signature: res.signature,
                rawData: res.rawData,
                iv: res.iv
              },
              header: {
                'content-type': 'application/json'
              },
              success: function (res) {
                console.log('已获取加密信息');
                // callback();
              }
            })

          }
        })
      },
      fail: function () {
        // fail
      },
      complete: function () {
        // complete
      }
    })

  }
})
