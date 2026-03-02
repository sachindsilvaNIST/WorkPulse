using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Data.Core;
using Avalonia.Data.Core.Plugins;
using Avalonia.Styling;
using System;
using System.Linq;
using Avalonia.Markup.Xaml;
using NistAttendance.Services;
using NistAttendance.ViewModels;
using NistAttendance.Views;

namespace NistAttendance;

public partial class App : Application
{
    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            DisableAvaloniaDataAnnotationValidation();

            // Load saved theme and font size before window creation
            try
            {
                var settingsService = new SettingsService();
                var settings = settingsService.LoadAsync().GetAwaiter().GetResult();

                RequestedThemeVariant = settings.ThemeVariant == "Dark"
                    ? ThemeVariant.Dark
                    : ThemeVariant.Light;

                double fontSize = settings.FontSizePreset switch
                {
                    "Small" => 12.0,
                    "Large" => 16.0,
                    _ => 14.0
                };
                Resources["DefaultFontSize"] = fontSize;
            }
            catch
            {
                RequestedThemeVariant = ThemeVariant.Light;
            }

            desktop.MainWindow = new MainWindow
            {
                DataContext = new MainWindowViewModel(),
            };
        }

        base.OnFrameworkInitializationCompleted();
    }

    private void DisableAvaloniaDataAnnotationValidation()
    {
        // Get an array of plugins to remove
        var dataValidationPluginsToRemove =
            BindingPlugins.DataValidators.OfType<DataAnnotationsValidationPlugin>().ToArray();

        // remove each entry found
        foreach (var plugin in dataValidationPluginsToRemove)
        {
            BindingPlugins.DataValidators.Remove(plugin);
        }
    }
}