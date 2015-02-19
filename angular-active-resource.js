/**
 * @angular >=1.3.0
 * @version 0.1
 * @author Igor Murujev
 *
 * Active Resource module extends ngResource module
 * and applies some extra methods and properties to
 * usual resource.
 *
 * ActiveResource behaves like a standart model and provides
 * functionality to check and show validation errors came from REST server.
 *
 * TODO: add _hash functionality to avoid updating and saving if model do not changed
 */
(function(window, angular, undefined){
	'use strict';

	angular.module('active-resource', ['ngResource'])
		.config(['$resourceProvider', '$httpProvider', function($resourceProvider, $httpProvider){

			$httpProvider.interceptors.push('resourceInterceptor');
			$resourceProvider.defaults.actions = angular.extend(
				$resourceProvider.defaults.actions,
				{'update': { method:'PUT'}}
			);
		}])
		.factory('resourceInterceptor', ['$q', function($q){
			return {
				'request': function(config) {
		      		return config;
				},
				'responseError': function(rejection) {
					var status = rejection.status,
						data = rejection.data,
						resource = rejection.config.data;

					if(resource && status === 422){
						resource.setErrors(data);
					}
					return $q.reject(rejection);
				 }
			};
		}])
		.factory('$activeResource', ['$resource', function($resource){

			function ActiveResource(url, params, methods, options){
				var Resource = $resource(url, params, methods, options);

				var ValidationError = function(fields){
					var _self = this;
					angular.forEach(fields, function(value, key){
						_self[key] = value;
					});
					return this;
				};

				Resource.prototype = angular.extend(
					{}, Resource.prototype, {
						'$$errors': [],
						'$$hash': null,
						hasErrors: function(){
							return this.$$errors.length > 0;
						},
						clearErrors: function(){
							this.$$errors = [];
						},
						getErrors: function(){
							return this.$$errors;
						},
						setErrors: function(errors){
							var _self = this;
							_self.clearErrors();
							angular.forEach(errors, function(error){
								_self.$$errors.push(new ValidationError(error))
							});
						},
						getError: function(condition){
							var error = null, _self = this;
							angular.forEach(_self.$$errors, function(err){
								angular.forEach(condition, function(fieldVal, fieldName){
									if(angular.isDefined(err[fieldName]) &&
										err[fieldName] == fieldVal){

										error =	err;
									}
								});
							});
							return error === null ? new ValidationError() : error;
						},
						updateHash: function(){
							var _self = this;
							console.log(_self);
						}
					}
				);
				return Resource;
			};

			return ActiveResource;
		}]);

})(window, window.angular);
