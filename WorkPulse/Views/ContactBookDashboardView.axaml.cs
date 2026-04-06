using System;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Layout;
using Avalonia.Media;
using WorkPulse.Models;
using WorkPulse.ViewModels;

namespace WorkPulse.Views;

public partial class ContactBookDashboardView : UserControl
{
    public ContactBookDashboardView()
    {
        InitializeComponent();

        var grid = this.FindControl<DataGrid>("ContactsGrid");
        if (grid != null)
        {
            grid.DoubleTapped += OnGridDoubleTapped;
        }
    }

    private async void OnGridDoubleTapped(object? sender, TappedEventArgs e)
    {
        if (DataContext is ContactBookDashboardViewModel vm && vm.SelectedContact != null)
        {
            await ShowContactDetailPopup(vm.SelectedContact);
        }
    }

    private async System.Threading.Tasks.Task ShowContactDetailPopup(ContactRecord contact)
    {
        var parentWindow = TopLevel.GetTopLevel(this) as Window;
        if (parentWindow == null) return;

        var dialog = new Window
        {
            Title = "Contact Details",
            Width = 420,
            Height = 460,
            CanResize = false,
            WindowStartupLocation = WindowStartupLocation.CenterOwner,
            Background = Brushes.Transparent,
            SystemDecorations = SystemDecorations.None,
            TransparencyLevelHint = new[] { WindowTransparencyLevel.Transparent }
        };

        // Rounded container inside transparent window
        var outerBorder = new Border
        {
            CornerRadius = new CornerRadius(16),
            Background = Brushes.White,
            ClipToBounds = true,
            BoxShadow = new BoxShadows(new BoxShadow
            {
                OffsetX = 0, OffsetY = 4, Blur = 24, Spread = 0,
                Color = Color.Parse("#44000000")
            })
        };

        var rootPanel = new StackPanel
        {
            Margin = new Thickness(0)
        };

        // Header bar (rounded top corners to match outer border)
        var headerBorder = new Border
        {
            Background = new SolidColorBrush(Color.Parse("#0078D4")),
            CornerRadius = new CornerRadius(16, 16, 0, 0),
            Padding = new Thickness(24, 16)
        };
        var headerPanel = new StackPanel { Spacing = 2 };
        headerPanel.Children.Add(new TextBlock
        {
            Text = contact.FullName,
            FontSize = 22,
            FontWeight = FontWeight.Bold,
            Foreground = Brushes.White
        });
        if (!string.IsNullOrWhiteSpace(contact.Affiliation))
        {
            headerPanel.Children.Add(new TextBlock
            {
                Text = contact.Affiliation,
                FontSize = 14,
                Foreground = new SolidColorBrush(Color.Parse("#D0E8FF")),
                Margin = new Thickness(0, 2, 0, 0)
            });
        }
        headerBorder.Child = headerPanel;
        rootPanel.Children.Add(headerBorder);

        // Detail rows
        var detailPanel = new StackPanel
        {
            Spacing = 0,
            Margin = new Thickness(0, 4, 0, 0)
        };

        AddDetailRow(detailPanel, "Department", contact.Department);
        AddDetailRow(detailPanel, "Email", contact.Email);
        AddDetailRow(detailPanel, "Intercom", contact.Intercom);
        AddDetailRow(detailPanel, "Contact No.", contact.ContactNumber);
        AddDetailRow(detailPanel, "Notes", contact.Notes);

        rootPanel.Children.Add(detailPanel);

        // Close button
        var closeButton = new Button
        {
            Content = "Close",
            HorizontalAlignment = HorizontalAlignment.Center,
            Padding = new Thickness(32, 8),
            Margin = new Thickness(0, 16, 0, 16),
            Background = new SolidColorBrush(Color.Parse("#0078D4")),
            Foreground = Brushes.White,
            FontSize = 14,
            CornerRadius = new CornerRadius(6)
        };
        closeButton.Click += (_, _) => dialog.Close();
        rootPanel.Children.Add(closeButton);

        outerBorder.Child = rootPanel;
        dialog.Content = outerBorder;

        // Add dim overlay to the view while popup is open
        var dimOverlay = new Border
        {
            Background = new SolidColorBrush(Color.Parse("#55000000")),
            IsHitTestVisible = false
        };
        var parentGrid = this.FindControl<Grid>("RootGrid");
        parentGrid?.Children.Add(dimOverlay);

        await dialog.ShowDialog(parentWindow);

        // Remove dim overlay
        parentGrid?.Children.Remove(dimOverlay);
    }

    private static void AddDetailRow(StackPanel parent, string label, string value)
    {
        var displayValue = string.IsNullOrWhiteSpace(value) ? "—" : value;

        var rowBorder = new Border
        {
            Padding = new Thickness(24, 10),
            BorderBrush = new SolidColorBrush(Color.Parse("#F0F0F0")),
            BorderThickness = new Thickness(0, 0, 0, 1)
        };

        var grid = new Grid
        {
            ColumnDefinitions = ColumnDefinitions.Parse("130,*")
        };

        var labelBlock = new TextBlock
        {
            Text = label,
            FontSize = 13,
            Foreground = new SolidColorBrush(Color.Parse("#888888")),
            FontWeight = FontWeight.SemiBold,
            VerticalAlignment = VerticalAlignment.Top
        };
        Grid.SetColumn(labelBlock, 0);

        var valueBlock = new SelectableTextBlock
        {
            Text = displayValue,
            FontSize = 14,
            Foreground = new SolidColorBrush(Color.Parse(displayValue == "—" ? "#BBBBBB" : "#222222")),
            TextWrapping = TextWrapping.Wrap,
            VerticalAlignment = VerticalAlignment.Top
        };
        Grid.SetColumn(valueBlock, 1);

        grid.Children.Add(labelBlock);
        grid.Children.Add(valueBlock);
        rowBorder.Child = grid;
        parent.Children.Add(rowBorder);
    }

    private async void CopyCell_Click(object? sender, Avalonia.Interactivity.RoutedEventArgs e)
    {
        if (sender is MenuItem menuItem &&
            menuItem.Parent is ContextMenu contextMenu &&
            contextMenu.PlacementTarget is SelectableTextBlock textBlock)
        {
            var clipboard = TopLevel.GetTopLevel(this)?.Clipboard;
            if (clipboard != null && !string.IsNullOrEmpty(textBlock.Text))
            {
                await clipboard.SetTextAsync(textBlock.Text);
            }
        }
    }
}
