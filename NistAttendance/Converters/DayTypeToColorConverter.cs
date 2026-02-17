using System;
using System.Globalization;
using Avalonia.Data.Converters;
using Avalonia.Media;
using NistAttendance.Models;

namespace NistAttendance.Converters;

public class DayTypeToColorConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is DayType dayType)
        {
            return dayType switch
            {
                DayType.Holiday => new SolidColorBrush(Color.FromRgb(255, 248, 220)),   // Light yellow
                DayType.RestDay => new SolidColorBrush(Color.FromRgb(230, 230, 230)),   // Light gray
                _ => Brushes.Transparent
            };
        }
        return Brushes.Transparent;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => throw new NotImplementedException();
}

public class OvertimeToBoldConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is bool isOvertime && isOvertime)
            return Avalonia.Media.FontWeight.Bold;
        return Avalonia.Media.FontWeight.Normal;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => throw new NotImplementedException();
}
