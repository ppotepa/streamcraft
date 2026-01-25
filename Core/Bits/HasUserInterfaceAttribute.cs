namespace Core.Bits;

[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = false)]
public class HasUserInterfaceAttribute : Attribute
{
    public HasUserInterfaceAttribute()
    {
    }
}