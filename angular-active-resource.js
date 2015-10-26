/**
 * @angular >=1.3.0
 * @version 0.6
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
				{
					'update': {
						method: 'PUT',
						transformRequest: function(resource){
							return angular.toJson(resource.getDirtyAttributes());
						}
					}
					'create': {method:'POST'}
				}
			);
		}])
		.factory('resourceInterceptor', ['$q', '$rootScope', function($q, $rootScope){
			return {
				'response': function(response){
					var status = response.status,
						data = response.data,
						resource = response.resource;

					if (angular.isObject(data) || angular.isArray(data)) {
						var unregister = $rootScope.$watch(function(){
							return response.resource;
						}, function(resource){
							if(! angular.isUndefined(resource)){
								if(angular.isArray(resource)) {
									angular.forEach(resource, function(value, key){
										if(angular.isFunction(value._updateRecordHash)){
											value._updateRecordHash();
										}
									});
								} else {
									if(angular.isFunction(resource._updateRecordHash)){
										resource._updateRecordHash();
									}
								}

								unregister();
							}
						}, true);
					}

					return response;
				},
				'responseError': function(rejection) {
					var status = rejection.status,
						data = rejection.data,
						resource = rejection.config.data;

					if(resource && angular.isFunction(resource.setErrors) && status === 422){
						resource.setErrors(data);
					}
					return $q.reject(rejection);
				 }
			};
		}])
		.factory('$activeResource', ['$resource', '$rootScope', function($resource, $rootScope){

			function ActiveResource(url, params, methods, options){
				if(!methods){methods = {};}
				if(!options){options = {};}

				options = angular.extend({}, {
	                identifier: 'id',
	                emitable: false
	            }, options);

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
						'$$oldAttributes': null,

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
						getFirstError: function(){
							var _self = this;
							if (angular.isUndefined(_self.$$errors[0])) {
								return null;
							}
							return _self.$$errors[0];
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
						isAttributeChanged: function(attribute){
							if (attribute.charAt(0) == '$') {
								return false;
							}
							var _self = this,
								oldData = angular.fromJson(_self.$$oldAttributes);
							if (!oldData || angular.isUndefined(oldData[attribute])) {
								return true;
							}
							var newValue = angular.copy(_self[attribute]),
								oldValue = angular.copy(oldData[attribute]);
							return (angular.toJson(newValue) !== angular.toJson(oldValue));
						},
						getDirtyAttributes: function(){
							var _self = this,
								modifiedData = {};
							angular.forEach(_self, function(value, attribute){
								if (_self.isAttributeChanged(attribute)) {
									modifiedData[attribute] = angular.copy(value);
								}
							});
							return modifiedData;
						},
						_updateRecordHash: function(firstCall){
							var _self = this;
							_self.$$oldAttributes = angular.toJson(angular.copy(_self));
							if(firstCall && options.emitable){
								$rootScope.$emit('resource.loaded', {
									name: options.emitable,
									resource: _self
								});
							}
						},
						isRecordChanged: function(){
							var _self = this;
							return angular.toJson(angular.copy(_self)) !== _self.$$oldAttributes;
						},
						isChanged: function(){
							return this.isRecordChanged();
						},
						isEmpty: function(){
							var _self = this;
							return !(_self && angular.isDefined(_self.id));
						},
						isNewRecord: function(){
							var _self = this, id = _self[options.identifier];
							return angular.isUndefined(id) || id === null || id === '';
						},
						revertRecord: function(a){
							var _self = this,
								attributes = angular.fromJson(_self.$$oldAttributes);

							angular.forEach(attributes, function(value, attribute){
								_self[attribute] = value;
							});

							_self.$$errors = [];
							if(angular.isFunction(a)){
								a();
							}
						},
						'$save': function(a,b,d){
							var _self = this;
							if (_self.isNewRecord()) {
								return _self.$create(a,b,d);
							}else{
								return _self.$update(a,b,d);
							}
						}
					}
				);
				return Resource;
			};

			return ActiveResource;
		}]);

})(window, window.angular);
