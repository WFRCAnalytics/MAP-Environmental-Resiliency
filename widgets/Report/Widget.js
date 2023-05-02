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
define(['dojo/_base/declare', 'jimu/BaseWidget', 'dojo/dom',],
function(declare, BaseWidget, dom) {
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
      
      wReport = this;
      
    },

    onOpen: function(){
      console.log('onOpen');
      wReport._widenWindow();
      wReport._updateReport();
    },

    onResize: function(){
      console.log('onResize');
      wReport._widenWindow();
    },

    onClose: function(){
      console.log('onClose');
      wReport.publishData({
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
      if(data.message === 'report') {
          wReport._updateReport();
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
    },

    _updateReport: function() {
      console.log('_updateReport')

      _maxRankShow = dom.byId('maxrank').value;
      
      // variable holding all html for report, starting as table
  
      var _innerHTML = '<table id="reporttable" style="color: black;"><tr bgcolor=\"#00008b\">';
      _innerHTML += "<td width=2%  align=\"center\" style=\"color: white;\">Rank</td>"
      _innerHTML += "<td width=5%  align=\"center\" style=\"color: white;\">ID  </td>"
      _innerHTML += "<td width=33% align=\"center\" style=\"color: white;\">Name</td>"
      _innerHTML += "<td width=6%  align=\"center\" style=\"color: white;\">Agricultural and Farmland</td>"
      _innerHTML += "<td width=6%  align=\"center\" style=\"color: white;\">Cultural and Historic Resources</td>"
      _innerHTML += "<td width=6%  align=\"center\" style=\"color: white;\">Environmental Justice Consideration</td>"
      _innerHTML += "<td width=6%  align=\"center\" style=\"color: white;\">Floodplains</td>"
      _innerHTML += "<td width=6%  align=\"center\" style=\"color: white;\">Geological Hazards</td>"
      _innerHTML += "<td width=6%  align=\"center\" style=\"color: white;\">Habitat and Wildlife</td>"
      _innerHTML += "<td width=6%  align=\"center\" style=\"color: white;\">Hazardous Materials & Contamination</td>"
      _innerHTML += "<td width=6%  align=\"center\" style=\"color: white;\">Hydrological</td>"
      _innerHTML += "<td width=6%  align=\"center\" style=\"color: white;\">Open Space, Parks, and Recreation</td>"
      _innerHTML += "<td width=6%  align=\"center\" style=\"color: white;\">Steep Slopes</td>"
      _innerHTML += "</tr>"

      var _ctRank = 1;
      var _ctElements = 1;
      var _ctRow = 0;
      
      for (p=0; p<aSortProjects.length; p++) {
        if (p>0) {
          // check if same score as previous
          if (aSortProjects[p].slice(0, -1).every((element, index) => element === aSortProjects[p-1].slice(0, -1)[index])) {
            // don't do anything since if they have the same scores, they should be the same rank
          } else {
            _ctRank = _ctElements;
          }
        }
        _ctElements++;
        
        _gID     = dGIds[parseInt(aSortProjects[p][lstBinLows.length])].g;
        _prjName = dGIds[parseInt(aSortProjects[p][lstBinLows.length])].n;
        _plnId   = dGIds[parseInt(aSortProjects[p][lstBinLows.length])].p;
        _gIndex  = dGIds.findIndex(obj => obj.g==_gID)

        if (_ctRank<=_maxRankShow & (fltrMode=='All' | dGIds.find(o => o['g'] == _gID).m == fltrMode)) {
            
          // color odd rows
          if (_ctRow % 2 !== 0) {
            _innerHTML += "<tr bgcolor=\"#e7f5fe\">"
          } else {
            _innerHTML += "<tr bgcolor=\"#FFFFFF\">"
          }

          _innerHTML += "<td align=\"center\">" + String(_ctRank) + "</td>"
          _innerHTML += "<td align=\"center\">" + _plnId          + "</td>"
          _innerHTML += "<td                 >" + _prjName        + "</td>"
          _innerHTML += aPrjCatLength_Weighted[_gIndex].map(item => "<td align=\"center\">" + item.toFixed(1).replace('0.0', '-').replace('.0', '').replace('1-', '10') + "</td>").join(''); + "</td>";
          _innerHTML += "</tr>"
          
          // increment row counter
          _ctRow++;
        }
      }
      _innerHTML += '</table>';
      if (fltrMode=='All') {
        dom.byId("reporttitle").innerHTML = 'Ranked Projects with Length Impacted by Each Category'
      } else {
        dom.byId("reporttitle").innerHTML = 'Ranked ' + fltrMode + ' Projects with Length Impacted by Each Category'
      }
      dom.byId("report").innerHTML = _innerHTML;
    },
    
    _copyTableToClipboard: function() {
      // Get the table element
      const table = document.getElementById('reporttable');
    
      // Serialize the table as HTML string
      const html = table.outerHTML;
    
      // Write the HTML string to the clipboard
      navigator.clipboard.writeText(html)
        .then(() => {
          console.log('Table copied to clipboard');
        })
        .catch((err) => {
          console.error('Failed to copy table: ', err);
        });
    }

  });
});