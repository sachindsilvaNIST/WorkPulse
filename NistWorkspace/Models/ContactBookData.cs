using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace NistAttendance.Models;

public class ContactBookData
{
    public List<ContactRecord> Contacts { get; set; } = new();

    [JsonIgnore]
    public int TotalContacts => Contacts.Count;
}
