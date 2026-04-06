using System;
using System.Globalization;
using Avalonia.Data.Converters;
using Avalonia.Media;
using WorkPulse.Models;

namespace WorkPulse.Converters;

public class DayTypeToColorConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is DayType dayType)
        {
            return dayType switch
            {
                DayType.AnnualPaidLeave => new SolidColorBrush(Color.FromRgb(255, 248, 220)),
                DayType.UnpaidLeave => new SolidColorBrush(Color.FromRgb(255, 240, 230)),
                DayType.PublicHoliday => new SolidColorBrush(Color.FromRgb(255, 248, 220)),
                DayType.Weekend => new SolidColorBrush(Color.FromRgb(230, 230, 230)),
                DayType.BusinessTrip => new SolidColorBrush(Color.FromRgb(220, 235, 255)),
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

public class OvertimeFlagToBackgroundConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is string flag)
        {
            return flag switch
            {
                "YES" => new SolidColorBrush(Color.Parse("#107C10")),  // Green (same as Holiday button)
                "NO" => new SolidColorBrush(Color.Parse("#D13438")),   // Red (same as Delete button)
                _ => Brushes.Transparent
            };
        }
        return Brushes.Transparent;
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => throw new NotImplementedException();
}

public class OvertimeFlagToForegroundConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        if (value is string flag && (flag == "YES" || flag == "NO"))
            return Brushes.White;
        return new SolidColorBrush(Color.Parse("#1A1A1A"));
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => throw new NotImplementedException();
}
