wx.checkSession({
      success: function (res) {
        wx.getStorage({
          key: 'wxtoken',
          success: function (res) {
            let wxtoken = res.data;
            //调用登录接口
          }
        })
      },
      fail: function (res) {
        wx.login({
          success: function (res) {
            let loginCode = res.code;
            let encryptedData = '';
            let signature = '';
            let rawData = '';
            let iv = '';
            if (res.code) {
              // 登录获取用户信息
              wx.getUserInfo({
                withCredentials: true,
                success: function (res) {
                  wx.request({
                    url: 'https://youngdze.co:8444/api/login', //仅为示例，并非真实的接口地址
                    data: {
                      code: loginCode,
                      encryptedData: res.encryptedData,
                      signature: res.signature,
                      rawData: res.rawData,
                      iv: res.iv
                    },
                    header: {
                      'content-type': 'application/json'
                    },
                    success: function (res) {
                      console.log('请求成功');
                      wx.setStorage({
                        key: 'wxtoken',
                        data: res.data.sessionid
                      })
                    }
                  })

                }
              })



            }
          }
        })
      }
    })
