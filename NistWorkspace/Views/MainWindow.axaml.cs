using System;
using System.ComponentModel;
using System.Linq;
using System.Threading.Tasks;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Layout;
using Avalonia.Media;
using Avalonia.Platform.Storage;
using Avalonia.Threading;
using NistAttendance.ViewModels;

namespace NistAttendance.Views;

public partial class MainWindow : Window
{
    private bool _forceClose;
    private DispatcherTimer? _clockTimer;

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
                vm.ShowContactEditDialog = ShowContactEditDialogAsync;
                vm.ShowConfirmDialog = ShowConfirmDialogAsync;

                // Listen for navigation changes to toggle toolbars
                vm.PropertyChanged += OnViewModelPropertyChanged;

                await vm.InitializeAsync();
                UpdateToolbarVisibility(vm.CurrentViewName);
            }

            StartClock();
        };

        Closing += OnWindowClosing;
        KeyDown += OnKeyDown;
    }

    // --- Keyboard Shortcuts ---

    private void OnKeyDown(object? sender, KeyEventArgs e)
    {
        if (DataContext is not MainWindowViewModel vm) return;

        if (e.KeyModifiers == KeyModifiers.Control)
        {
            switch (e.Key)
            {
                case Key.D1:
                    vm.NavigateTo("attendance");
                    e.Handled = true;
                    break;
                case Key.D2:
                    vm.NavigateTo("contacts");
                    e.Handled = true;
                    break;
                case Key.D3:
                    vm.NavigateTo("search");
                    e.Handled = true;
                    break;
                case Key.H:
                    vm.NavigateTo("home");
                    e.Handled = true;
                    break;
                case Key.F:
                    FocusSearchBar();
                    e.Handled = true;
                    break;
                case Key.OemComma:
                    vm.NavigateTo("settings");
                    e.Handled = true;
                    break;
            }
        }
        else if (e.Key == Key.F1 && e.KeyModifiers == KeyModifiers.None)
        {
            ShowKeyboardShortcutsDialog();
            e.Handled = true;
        }
    }

    private void FocusSearchBar()
    {
        var contentArea = this.FindControl<ContentControl>("ContentArea");
        if (contentArea?.Content is not Control currentView) return;

        var textBox = FindSearchTextBox(currentView);
        textBox?.Focus();
    }

    private static TextBox? FindSearchTextBox(Control root)
    {
        if (root is TextBox tb && !string.IsNullOrEmpty(tb.Watermark) &&
            tb.Watermark.Contains("search", StringComparison.OrdinalIgnoreCase))
            return tb;

        if (root is Panel panel)
        {
            foreach (var child in panel.Children)
            {
                if (child is Control ctrl)
                {
                    var found = FindSearchTextBox(ctrl);
                    if (found != null) return found;
                }
            }
        }
        else if (root is ContentControl cc && cc.Content is Control content)
        {
            return FindSearchTextBox(content);
        }
        else if (root is Decorator dec && dec.Child is Control decChild)
        {
            return FindSearchTextBox(decChild);
        }

        return null;
    }

    private async void ShowKeyboardShortcutsDialog()
    {
        var dialog = new Window
        {
            Title = "Keyboard Shortcuts",
            Width = 400,
            Height = 380,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            CanResize = false,
            ShowInTaskbar = false
        };

        var rootPanel = new StackPanel { Margin = new Thickness(24), Spacing = 16 };

        rootPanel.Children.Add(new TextBlock
        {
            Text = "Keyboard Shortcuts",
            FontSize = 20,
            FontWeight = FontWeight.Bold
        });

        var shortcuts = new[]
        {
            ("Ctrl + 1", "Attendance Dashboard"),
            ("Ctrl + 2", "Contact Book"),
            ("Ctrl + 3", "File Search"),
            ("Ctrl + H", "Home"),
            ("Ctrl + F", "Focus Search Bar"),
            ("Ctrl + ,", "Settings"),
            ("F1", "This Help Dialog"),
        };

        var grid = new Grid
        {
            ColumnDefinitions = ColumnDefinitions.Parse("140,*"),
            RowDefinitions = RowDefinitions.Parse(string.Join(",", Enumerable.Repeat("Auto", shortcuts.Length)))
        };

        for (int i = 0; i < shortcuts.Length; i++)
        {
            var keyText = new TextBlock
            {
                Text = shortcuts[i].Item1,
                FontFamily = new FontFamily("Consolas,Monospace"),
                FontSize = 13,
                FontWeight = FontWeight.SemiBold,
                Margin = new Thickness(0, 4)
            };
            Grid.SetRow(keyText, i);
            Grid.SetColumn(keyText, 0);

            var descText = new TextBlock
            {
                Text = shortcuts[i].Item2,
                FontSize = 13,
                Margin = new Thickness(0, 4)
            };
            Grid.SetRow(descText, i);
            Grid.SetColumn(descText, 1);

            grid.Children.Add(keyText);
            grid.Children.Add(descText);
        }

        rootPanel.Children.Add(grid);

        var closeBtn = new Button
        {
            Content = "Close",
            HorizontalAlignment = HorizontalAlignment.Center,
            Padding = new Thickness(24, 8),
            Margin = new Thickness(0, 8, 0, 0),
            Background = new SolidColorBrush(Color.Parse("#0078D4")),
            Foreground = Brushes.White,
            FontWeight = FontWeight.SemiBold
        };
        closeBtn.Click += (_, _) => dialog.Close();
        rootPanel.Children.Add(closeBtn);

        dialog.Content = rootPanel;
        await dialog.ShowDialog(this);
    }

    // --- Live Clock ---

    private void StartClock()
    {
        var clockText = this.FindControl<TextBlock>("ClockText");
        if (clockText == null) return;

        clockText.Text = DateTime.Now.ToString("HH:mm:ss");

        _clockTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
        _clockTimer.Tick += (_, _) =>
        {
            clockText.Text = DateTime.Now.ToString("HH:mm:ss");
        };
        _clockTimer.Start();
    }

    // --- Navigation / Toolbar ---

    private void OnViewModelPropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName == nameof(MainWindowViewModel.CurrentViewName) &&
            sender is MainWindowViewModel vm)
        {
            UpdateToolbarVisibility(vm.CurrentViewName);
        }
    }

    private void UpdateToolbarVisibility(string viewName)
    {
        var attendanceToolbar = this.FindControl<StackPanel>("AttendanceToolbar");
        var contactsToolbar = this.FindControl<StackPanel>("ContactsToolbar");
        var fileSearchToolbar = this.FindControl<StackPanel>("FileSearchToolbar");
        var importExportToolbar = this.FindControl<StackPanel>("ImportExportToolbar");
        var importExcelBtn = this.FindControl<Button>("ImportExcelBtn");
        var toolbarBorder = this.FindControl<Border>("ToolbarBorder");
        var sectionTitle = this.FindControl<TextBlock>("SectionTitle");
        var toolbarSettingsBtn = this.FindControl<Button>("ToolbarSettingsBtn");
        var statusModuleName = this.FindControl<TextBlock>("StatusModuleName");

        bool isHome = viewName == "home";
        bool isAttendance = viewName == "attendance";
        bool isContacts = viewName == "contacts";
        bool isSearch = viewName == "search";
        bool isSettings = viewName == "settings";

        if (toolbarBorder != null) toolbarBorder.IsVisible = !isHome;
        if (attendanceToolbar != null) attendanceToolbar.IsVisible = isAttendance;
        if (contactsToolbar != null) contactsToolbar.IsVisible = isContacts;
        if (fileSearchToolbar != null) fileSearchToolbar.IsVisible = isSearch;
        if (importExportToolbar != null) importExportToolbar.IsVisible = isAttendance || isContacts;
        if (importExcelBtn != null) importExcelBtn.IsVisible = isAttendance;
        if (toolbarSettingsBtn != null) toolbarSettingsBtn.IsVisible = !isHome && !isSettings;

        if (sectionTitle != null)
        {
            sectionTitle.Text = viewName switch
            {
                "attendance" => "Attendance Management",
                "contacts" => "Contact Book",
                "search" => "File Search",
                "settings" => "Settings",
                _ => ""
            };
        }

        if (statusModuleName != null)
        {
            statusModuleName.Text = viewName switch
            {
                "attendance" => "Attendance",
                "contacts" => "Contacts",
                "search" => "File Search",
                "settings" => "Settings",
                "home" => "Home",
                _ => ""
            };
        }
    }

    // --- Window Closing ---

    private async void OnWindowClosing(object? sender, CancelEventArgs e)
    {
        if (_forceClose) return;

        if (DataContext is not MainWindowViewModel vm) return;

        // Check for unsaved attendance changes
        if (vm.AttendanceDashboard is { HasUnsavedChanges: true })
        {
            e.Cancel = true;

            var save = await ShowUnsavedChangesDialogAsync();
            if (save == true)
            {
                await vm.AttendanceDashboard.SaveAllChangesCommand.ExecuteAsync(null);
                _forceClose = true;
                Close();
            }
            else if (save == false)
            {
                _forceClose = true;
                Close();
            }
            return;
        }

        // Check for pending OT records
        if (vm.AttendanceDashboard != null && vm.AttendanceDashboard.HasPendingOvertimeRecords())
        {
            e.Cancel = true;

            var pendingRecords = vm.AttendanceDashboard.GetPendingOvertimeRecords();
            var dateList = string.Join("\n",
                pendingRecords.Select(r => $"  - {r.Date:yyyy-MM-dd} ({r.DayAbbreviation})"));

            var goBack = await ShowOtWarningDialogAsync(dateList);

            if (!goBack)
            {
                _forceClose = true;
                Close();
            }
        }
    }

    // --- Dialogs ---

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

    private async Task<bool> ShowContactEditDialogAsync(ContactEntryViewModel entryVm)
    {
        var dialog = new ContactEntryDialog(entryVm);
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
