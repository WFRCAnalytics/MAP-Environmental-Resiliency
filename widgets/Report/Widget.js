///////////////////////////////////////////////////////////////////////////
// Copyright © Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
define(['dojo/_base/declare', 'jimu/BaseWidget'],
function(declare, BaseWidget) {
  //To create a widget, you need to derive from BaseWidget.
  return declare([BaseWidget], {
    // DemoWidget code goes here

    //please note that this property is be set by the framework when widget is loaded.
    //templateString: template,

    baseClass: 'jimu-widget-report',

    postCreate: function() {
      this.inherited(arguments);
      console.log('postCreate');
    },

    startup: function() {
      // this.inherited(arguments);
      // this.mapIdNode.innerHTML = 'map id:' + this.map.id;
      console.log('startup');
      
      wD = this;
      
    },

    onOpen: function(){
      console.log('onOpen');
      wD._widenWindow();
    },

    onResize: function(){
      console.log('onResize');
      wD._widenWindow();
    },

    onClose: function(){
      console.log('onClose');
      wD.publishData({
          message: "remove_report"
      });
    },

    onMinimize: function(){
      console.log('onMinimize');
    },

    onMaximize: function(){
      console.log('onMaximize');
    },

    onSignIn: function(credential){
      /* jshint unused:false*/
      console.log('onSignIn');
    },

    onSignOut: function(){
      console.log('onSignOut');
    },
    
    //Run onOpen when receiving a message from OremLayerSymbology
    onReceiveData: function(name, widgetId, data, historyData) {
      //filter out messages
      if(name !== 'report') {
          return;
      } else {
          wLS._updateReport();
      }
    },

    _widenWindow: function() {
      var windowWidth = window.innerWidth;
      console.log("Window width is: " + windowWidth);
      var panel = this.getPanel();
      var pos = panel.position;
      pos.width = windowWidth - 375;
      panel.setPosition(pos);
      panel.panelManager.normalizePanel(panel);
    }

  });
});