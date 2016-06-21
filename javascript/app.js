/**
 * Created by marchaubenstock on 24/03/16.
 */
angular

.module('vis', ['ui.layout','rzModule','ui.grid','ui.grid.selection','ngMaterial'])

.controller('MainCtrl', function($scope) {

  $scope.current_country = "";
  $scope.current_county = "";
  $scope.node_count = "";
  $scope.edge_count = "";

  $scope.slider = {
      min: 2000,
      max: 2014,
      options: {
        floor: 2000,
        ceil: 2014,
        onChange: function(d,min,max){
          $scope.$broadcast('year-changed', {min: min, max: max});
        }
      }
  };

  $scope.classGrid= {
      enableRowSelection: true,
      enableSelectAll: true,
      selectionRowHeaderWidth: 35,
      multiSelect: true,
      data: []
  };

  $scope.selectedRows = [];

  $scope.classGrid.onRegisterApi = function(gridApi) {
    $scope.gridApi = gridApi;
    
    $scope.$on('subjects-loaded', function(event, data){

      $scope.classGrid.data = data.data.map(function(d,i){
        return {
          "subfield": d.subfield,
          "field": d.field,
          "area": d.area,
          "subfield_id" : d.id_subfield
        };
      });

      $scope.$digest();
      gridApi.selection.selectAllRows();
    });

    gridApi.selection.on.rowSelectionChanged($scope,function(row){
      $scope.$broadcast('category-selection-changed', {data: gridApi.selection.getSelectedRows()});
    });

    gridApi.selection.on.rowSelectionChangedBatch($scope, function(rows){
      $scope.$broadcast('category-selection-changed', {data: gridApi.selection.getSelectedRows()});
    });
  };

  $scope.countrySelected = function(){
    $scope.$broadcast('country-selection-changed', {
      data: $scope.countries.filter(function(d){
        return d.checked;
      }).map(function(d){
        return d.name;
      })
    });
  }

  $scope.countries = [
      "Brunei",
      "Indonesia",
      "Cambodia",
      "Laos",
      "Myanmar",
      "Malaysia",
      "Philippines",
      "Singapore",
      "Thailand",
      "Vietnam"
    ].map(function(d){
      return {
        name: d,
        checked: false
      }
    });
   
   $scope.citation_thresh = {
       text: '',
        word: /^\s*\d*\s*$/
   };

})

.directive('worldMap', function(){
  return {
    restrict: 'E',
    scope: {

    },
    link: function(scope, element, attrs) {

      if (element === undefined) {
        return;
      }

      var world = new World(element[0]);

      scope.$on('year-changed', function(event, data){
        world.setSelectedYear(data.min, data.max);
        world.quickupdate();
      });

      scope.$on('country-selection-changed', function(event, data) {
        world.setSelectedCountries(data.data);
        world.quickupdate();
      });

      scope.$on('category-selection-changed', function(event, data) {
        world.setSelectedRows(data.data);
        world.quickupdate();
      });

      scope.$on('ui.layout.loaded',  debounce(
        function(evt, id){
          world.update();
        }, 250)
      );
      scope.$on('ui.layout.toggle', debounce(
        function(e, container){
          // Only update the canvas with the new dimensions
          var width = element[0].parentElement.offsetWidth;
          var height = element[0].parentElement.offsetHeight;
          world.updateCanvas(width, height);
        }, 250)
      );
      scope.$on('ui.layout.resize', debounce(
        function(e, beforeContainer, afterContainer){
          // Only update the canvas with the new dimensions
          var width = element[0].parentElement.offsetWidth;
          var height = element[0].parentElement.offsetHeight;
          world.updateCanvas(width, height);
          world.quickupdate();
        }, 250)
      );
    }
  };
});

