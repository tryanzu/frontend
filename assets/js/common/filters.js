var filters = angular.module('filtersModule', []);

filters.filter('date_at', function() {
	return function(input) {
		var date = new Date(input);
    var months = new Array("enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre");

		return date.getDay() + ' de ' + months[date.getMonth()] + ' de ' + date.getFullYear();
	};
});

filters.filter('timeago', function () {
  return function(input, uppercase) {

    // Start time from unix php time
    var date = new Date(input);
    var now  = new Date();

    // Diff
    var diff = now.getTime() - date.getTime();
    var diff = Math.abs(diff / 1000);

    // Just seconds
    if (diff < 60) {
      if(Math.floor(diff) == 1 || Math.floor(diff) == 0)
        return '1 segundo'
      else
        return Math.floor(diff) + ' segundos';
    }

    // Just minutes
    if (diff >= 60 && diff < 3600)
    {
      var minutes = diff / 60;
      var minutes = Math.floor(minutes);

      if(minutes == 1)
        return '1 minuto'
      else
        return minutes + ' minutos';
    }

    // Just hours
    if (diff >= 3600 && diff < (86400))
    {
      var hours = diff / 3600;
      var hours = Math.floor(hours);

      if(hours == 1)
        return '1 hora'
      else
        return hours + ' horas';
    }

    // Days
    if (diff >= 86400 && diff < 2592000)
    {
      var days = diff / 86400;
      var days = Math.floor(days);

      if(days == 1)
        return '1 día'
      else
        return days + ' días';
    }

    // Months
    if (diff >= 2592000 && diff < 31104000)
    {
      var months = diff / 2592000;
      var months = Math.floor(months);

      if(months == 1)
        return '1 mes'
      else
        return months + ' meses';
    }

    // Years
    if (diff >= 31104000)
    {
      var years = diff / 31104000;
      var years = Math.floor(years);

      if(years == 1)
        return '1 año'
      else
        return years + 'años';
    }
  };
});

filters.filter('toArray', function() { return function(obj) {
  if (!(obj instanceof Object)) return obj;
  return _.map(obj, function(val, key) {
    return Object.defineProperty(val, '$key', {__proto__: null, value: key});
  });
}});