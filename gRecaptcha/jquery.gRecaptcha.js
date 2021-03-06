(function(jQuery) {
  jQuery.ajaxSettings.traditional = true;

  var settings = {
    timerType: 2,
    timerTime: 20,
    workDir: '../gRecaptcha/',
    fileAjax: 'ajax.gRecaptcha.php',
    urlApiJs: '',
    urlGoogleSiteVerify: '',
    reCAPTCHA_siteKey: '',
    reCAPTCHA_secret: '',
    showLog: false,
    storageItemName: 'gRecaptcha_'
  };

  var properties = {
    googleToken: '',
    timerId: 0,
    timerIteration: 0
  };

  var methods = {
    init: function(options) {
      if (options) {
        jQuery.extend(settings, options);
      }

      methods.showLog('Start.');
      if (methods.storageGetItem('status') === 'success') {
        methods.showLog('Work is done.');
        return false;
      }

      // Step one. Load config
      methods.storageSetItem('status', '');
      methods.loadConfig();
    },

    loadConfig: function() {
      methods.showLog('Step 1. Load config.');
      jQuery.ajax({
        url: settings.workDir + settings.fileAjax,
        type: 'POST',
        dataType: 'json',
        data: {
          action: 'loadConfig'
        },
        error: function() {
          methods.showWarningLog('Failed to load action file.');
        },
        success: function(data) {
          if (data) {
            // update settings
            settings.timerType = data.config.timerType;
            settings.timerTime = data.config.timerTime;
            settings.urlApiJs = data.config.urlGoogleApiJs;
            settings.urlGoogleSiteVerify = data.config.urlGoogleSiteVerify;
            settings.reCAPTCHA_siteKey = data.config.reCAPTCHA_siteKey;
            settings.reCAPTCHA_secret = data.config.reCAPTCHA_secret;
            // user info
            methods.storageSetItem('user', data.user);
            methods.storageSetItem('timeUpdate', new Date());
            methods.storageSetItem('timerTime', settings.timerTime);

            methods.showLog('Success');
            // Step two. Add JS script.
            methods.addScript();
          } else {
            methods.showWarningLog('Settings file empty.');
          }
        }
      });
    },

    addScript: function() {
      methods.showLog('Step 2. Add JS script.');
      jQuery.getScript(settings.urlApiJs + '?render=' + settings.reCAPTCHA_siteKey)
        .done(function() {
          // Step three. Get Google token.
          methods.getGoogleToken();
          // Step four. Start timer.
          methods.startTimer();
        })
        .fail(function() {
          methods.showWarningLog('Failed to load file ' + settings.urlApiJs);
        });
    },

    startTimer: function() {
      methods.showLog('Step 4. Start timer: ' + settings.timerTime + ' sec.');
      var sendRequestAfter = settings.timerTime * 1000;

      if (settings.timerType == 1) {
        if (methods.storageGetItem('timerStart') === null) {
          methods.storageSetItem('timerStart', +new Date());
          methods.storageSetItem('timerStop', +new Date() + settings.timerTime * 1000);
        }

        var timerNow  = +new Date(),
            timerStop = methods.storageGetItem('timerStop');

        if (timerNow >= timerStop) {
          sendRequestAfter = 0
        } else {
          sendRequestAfter = timerStop - timerNow;
        }
      }

      methods.showLog('Send request after ' + (sendRequestAfter / 1000).toFixed(0) + ' sec.');

      properties.timerId = setTimeout(function() {
        properties.timerIteration++;
        // Step five. Get Google score.
        methods.getGoogleScore();
      }, sendRequestAfter);

    },

    clearTimer: function() {
      clearTimeout(properties.timerId);
    },

    getGoogleToken: function() {
      methods.showLog('Step 3. Get Google token.');
      if (properties.timerIteration > 1 && !properties.googleToken) {
        methods.showLog('Google token is NULL');
        methods.clearTimer();
        return false;
      }
      grecaptcha.ready(function() {
        grecaptcha.execute(settings.reCAPTCHA_siteKey, {action: 'checkMember'})
        .then(function(token) {
          properties.googleToken = token;
        });
      });
    },

    getGoogleScore: function() {
      methods.showLog('Step 5. Get Google score.');
      if (!properties.googleToken) {
        methods.showWarningLog('Failed get Google Score. Token from Google is null');
        return false;
      }
      jQuery.ajax({
        url: settings.workDir + settings.fileAjax,
        type: 'POST',
        dataType: 'json',
        data: {
          action: 'getGoogleScore',
          token: properties.googleToken,
          page: document.location.href
        },
        error: function() {
          methods.showWarningLog('Failed to load action file.');
          methods.clearTimer();
          methods.showLog('Finish.');
        },
        success: function(data) {
          methods.storageSetItem('GoogleScore', data.score);
          methods.storageSetItem('status', 'success');
          methods.clearTimer();
          methods.showLog('Finish.');
        }
      });
    },

    storageSetItem: function(itemName, itemValue) {
      if (itemName && itemValue) {
        localStorage.setItem(settings.storageItemName + itemName, itemValue);
      }
    },

    storageGetItem: function(itemName) {
      var value = false;
      if (itemName) {
        value = localStorage.getItem(settings.storageItemName + itemName);
      }
      return value;
    },

    storageRemoveItem: function(itemName) {
      if (itemName) {
        localStorage.removeItem(settings.storageItemName + itemName);
      }
    },

    showLog: function(str) {
      if (settings.showLog) {
        if (typeof str === 'string') {
          console.log('gRecaptcha: ' + str);
        } else {
          console.log(str);
        }
      }
    },

    showWarningLog: function(str) {
      if (settings.showLog) {
        console.warn('gRecaptcha ERROR: ' + str);
      }
    }
  };

  jQuery.fn.gRecaptcha = function(method) {
    // Method calling logic
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      jQuery.error('Method ' + method + ' does not exist on jQuery.gRecaptcha');
    }
  };
})(jQuery);