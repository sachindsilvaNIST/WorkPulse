using System;
using System.Globalization;
using Avalonia.Data.Converters;
using Avalonia.Media;

namespace WorkPulse.Converters;

/// <summary>
/// Deterministically maps a category label to one of a fixed accent palette, so bookmark
/// cards read as a colorful library at a glance instead of a wall of identical gray boxes.
/// </summary>
public static class CategoryPalette
{
    private static readonly string[] Accents =
    {
        "#007AFF", "#FF9500", "#00C7BE", "#FF2D55",
        "#8B5CF6", "#34C759", "#FF3B30", "#5AC8FA"
    };

    private static readonly Color Neutral = Color.Parse("#6E6E73");

    public static Color Pick(string? category)
    {
        if (string.IsNullOrWhiteSpace(category) || category == "All")
            return Neutral;

        var hash = 0;
        foreach (var c in category.ToLowerInvariant())
            hash = hash * 31 + c;

        var index = Math.Abs(hash) % Accents.Length;
        return Color.Parse(Accents[index]);
    }
}

public class CategoryToAccentBrushConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        => new SolidColorBrush(CategoryPalette.Pick(value as string));

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => throw new NotImplementedException();
}

/// <summary>Same accent, at low opacity, for a card's ambient background wash.</summary>
public class CategoryToTintBrushConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var accent = CategoryPalette.Pick(value as string);
        return new SolidColorBrush(accent, 0.1);
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => throw new NotImplementedException();
}

/// <summary>Same accent, at slightly higher opacity, for a card's ambient border.</summary>
public class CategoryToBorderBrushConverter : IValueConverter
{
    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        var accent = CategoryPalette.Pick(value as string);
        return new SolidColorBrush(accent, 0.3);
    }

    public object? ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        => throw new NotImplementedException();
}
