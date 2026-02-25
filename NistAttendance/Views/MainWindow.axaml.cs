using System.ComponentModel;
using System.Linq;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Platform.Storage;
using NistAttendance.ViewModels;

namespace NistAttendance.Views;

public partial class MainWindow : Window
{
    private bool _forceClose;

    public MainWindow()
    {
        InitializeComponent();

        Loaded += async (_, _) =>
        {
            if (DataContext is MainWindowViewModel vm)
            {
                vm.ShowOpenFileDialog = ShowOpenFileDialogAsync;
                vm.ShowSaveFileDialog = ShowSaveFileDialogAsync;
                vm.ShowEditDialog = ShowEditDialogAsync;
                vm.ShowConfirmDialog = ShowConfirmDialogAsync;
                await vm.InitializeAsync();
            }
        };

        Closing += OnWindowClosing;
    }

    private async void OnWindowClosing(object? sender, CancelEventArgs e)
    {
        if (_forceClose) return;

        if (DataContext is not MainWindowViewModel vm) return;

        // Check for unsaved inline changes first
        if (vm.Dashboard.HasUnsavedChanges)
        {
            e.Cancel = true;

            var save = await ShowUnsavedChangesDialogAsync();
            if (save == true)
            {
                // User chose "Save & Close"
                await vm.Dashboard.SaveAllChangesCommand.ExecuteAsync(null);
                _forceClose = true;
                Close();
            }
            else if (save == false)
            {
                // User chose "Discard & Close"
                _forceClose = true;
                Close();
            }
            // else: save == null → user chose "Go Back" - window stays open
            return;
        }

        // Check for pending OT records
        if (vm.Dashboard.HasPendingOvertimeRecords())
        {
            e.Cancel = true;

            var pendingRecords = vm.Dashboard.GetPendingOvertimeRecords();
            var dateList = string.Join("\n",
                pendingRecords.Select(r => $"  - {r.Date:yyyy-MM-dd} ({r.DayAbbreviation})"));

            var goBack = await ShowOtWarningDialogAsync(dateList);

            if (!goBack)
            {
                // User chose "Close Anyway"
                _forceClose = true;
                Close();
            }
            // else: user chose "Go Back" - window stays open
        }
    }

    /// <summary>
    /// Returns true=Save, false=Discard, null=Go Back (cancel close).
    /// </summary>
    private async Task<bool?> ShowUnsavedChangesDialogAsync()
    {
        var dialog = new Window
        {
            Title = "Unsaved Changes",
            Width = 420,
            Height = 200,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            CanResize = false,
            ShowInTaskbar = false
        };

        bool? result = null;

        var panel = new StackPanel { Margin = new Thickness(20), Spacing = 14 };

        panel.Children.Add(new TextBlock
        {
            Text = "You have unsaved changes. What would you like to do?",
            FontWeight = FontWeight.Bold,
            Foreground = new SolidColorBrush(Color.Parse("#FF8C00")),
            TextWrapping = TextWrapping.Wrap
        });

        var buttonPanel = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            HorizontalAlignment = HorizontalAlignment.Right,
            Spacing = 8,
            Margin = new Thickness(0, 8, 0, 0)
        };

        var discardBtn = new Button
        {
            Content = "Discard & Close",
            Padding = new Thickness(14, 6),
            Background = new SolidColorBrush(Color.Parse("#D13438")),
            Foreground = Brushes.White
        };
        discardBtn.Click += (_, _) => { result = false; dialog.Close(); };

        var backBtn = new Button
        {
            Content = "Go Back",
            Padding = new Thickness(14, 6),
            Background = new SolidColorBrush(Color.Parse("#E5E5EA")),
            Foreground = new SolidColorBrush(Color.Parse("#1A1A1A"))
        };
        backBtn.Click += (_, _) => { result = null; dialog.Close(); };

        var saveBtn = new Button
        {
            Content = "Save & Close",
            Padding = new Thickness(14, 6),
            FontWeight = FontWeight.Bold,
            Background = new SolidColorBrush(Color.Parse("#107C10")),
            Foreground = Brushes.White
        };
        saveBtn.Click += (_, _) => { result = true; dialog.Close(); };

        buttonPanel.Children.Add(discardBtn);
        buttonPanel.Children.Add(backBtn);
        buttonPanel.Children.Add(saveBtn);
        panel.Children.Add(buttonPanel);

        dialog.Content = panel;
        await dialog.ShowDialog(this);
        return result;
    }

    private async Task<bool> ShowOtWarningDialogAsync(string dateList)
    {
        var dialog = new Window
        {
            Title = "Overtime Field Incomplete",
            Width = 450,
            Height = 280,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            CanResize = false,
            ShowInTaskbar = false
        };

        var goBack = true;

        var panel = new StackPanel { Margin = new Thickness(20), Spacing = 12 };

        panel.Children.Add(new TextBlock
        {
            Text = "WARNING: The following records have the Overtime field left blank:",
            FontWeight = FontWeight.Bold,
            Foreground = Brushes.OrangeRed,
            TextWrapping = TextWrapping.Wrap
        });

        panel.Children.Add(new TextBlock
        {
            Text = dateList,
            FontFamily = new FontFamily("Monospace"),
            TextWrapping = TextWrapping.Wrap,
            Margin = new Thickness(8, 0, 0, 0)
        });

        panel.Children.Add(new TextBlock
        {
            Text = "Please enter EDIT MODE and update the Overtime field for these records.",
            TextWrapping = TextWrapping.Wrap,
            Foreground = Brushes.Gray,
            FontStyle = FontStyle.Italic
        });

        var buttonPanel = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            HorizontalAlignment = HorizontalAlignment.Right,
            Spacing = 8,
            Margin = new Thickness(0, 8, 0, 0)
        };

        var closeBtn = new Button
        {
            Content = "Close Anyway",
            Padding = new Thickness(16, 6),
            Background = new SolidColorBrush(Color.Parse("#D13438")),
            Foreground = Brushes.White
        };
        closeBtn.Click += (_, _) => { goBack = false; dialog.Close(); };

        var backBtn = new Button
        {
            Content = "Go Back",
            Padding = new Thickness(16, 6),
            FontWeight = FontWeight.Bold,
            Background = new SolidColorBrush(Color.Parse("#0078D4")),
            Foreground = Brushes.White
        };
        backBtn.Click += (_, _) => { goBack = true; dialog.Close(); };

        buttonPanel.Children.Add(closeBtn);
        buttonPanel.Children.Add(backBtn);
        panel.Children.Add(buttonPanel);

        dialog.Content = panel;
        await dialog.ShowDialog(this);
        return goBack;
    }

    private async Task<string?> ShowOpenFileDialogAsync()
    {
        var files = await StorageProvider.OpenFilePickerAsync(new FilePickerOpenOptions
        {
            Title = "Select Excel File",
            AllowMultiple = false,
            FileTypeFilter = new[]
            {
                new FilePickerFileType("Excel Files") { Patterns = new[] { "*.xlsx" } },
                new FilePickerFileType("All Files") { Patterns = new[] { "*" } }
            }
        });

        return files.FirstOrDefault()?.Path.LocalPath;
    }

    private async Task<string?> ShowSaveFileDialogAsync(string suggestedName)
    {
        var file = await StorageProvider.SaveFilePickerAsync(new FilePickerSaveOptions
        {
            Title = "Export to Excel",
            DefaultExtension = "xlsx",
            SuggestedFileName = $"{suggestedName}.xlsx",
            FileTypeChoices = new[]
            {
                new FilePickerFileType("Excel Files") { Patterns = new[] { "*.xlsx" } }
            }
        });

        return file?.Path.LocalPath;
    }

    private async Task<bool> ShowEditDialogAsync(AttendanceEntryViewModel entryVm)
    {
        var dialog = new AttendanceEntryDialog(entryVm);
        await dialog.ShowDialog(this);
        return entryVm.DialogResult;
    }

    private async Task<bool> ShowConfirmDialogAsync(string title, string message)
    {
        var dialog = new Window
        {
            Title = title,
            Width = 380,
            Height = 180,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            CanResize = false,
            ShowInTaskbar = false
        };

        var result = false;

        var panel = new StackPanel { Margin = new Thickness(20), Spacing = 16 };
        panel.Children.Add(new TextBlock { Text = message, TextWrapping = TextWrapping.Wrap });

        var buttonPanel = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            HorizontalAlignment = HorizontalAlignment.Right,
            Spacing = 8
        };

        var cancelBtn = new Button
        {
            Content = "Cancel",
            Padding = new Thickness(16, 6),
            Background = new SolidColorBrush(Color.Parse("#E5E5EA")),
            Foreground = new SolidColorBrush(Color.Parse("#1A1A1A"))
        };
        cancelBtn.Click += (_, _) => { result = false; dialog.Close(); };

        var okBtn = new Button
        {
            Content = "Confirm",
            Padding = new Thickness(16, 6),
            FontWeight = FontWeight.Bold,
            Background = new SolidColorBrush(Color.Parse("#D13438")),
            Foreground = Brushes.White
        };
        okBtn.Click += (_, _) => { result = true; dialog.Close(); };

        buttonPanel.Children.Add(cancelBtn);
        buttonPanel.Children.Add(okBtn);
        panel.Children.Add(buttonPanel);

        dialog.Content = panel;
        await dialog.ShowDialog(this);
        return result;
    }
}
