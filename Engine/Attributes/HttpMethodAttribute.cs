namespace Engine.Attributes;

public enum HttpMethod
{
    Get,
    Post,
    Put,
    Delete,
    Patch
}

[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public class HttpMethodAttribute : Attribute
{
    public HttpMethod Method { get; }

    public HttpMethodAttribute(HttpMethod method)
    {
        Method = method;
    }
}

public class HttpGetAttribute : HttpMethodAttribute
{
    public HttpGetAttribute() : base(HttpMethod.Get) { }
}

public class HttpPostAttribute : HttpMethodAttribute
{
    public HttpPostAttribute() : base(HttpMethod.Post) { }
}

public class HttpPutAttribute : HttpMethodAttribute
{
    public HttpPutAttribute() : base(HttpMethod.Put) { }
}

public class HttpDeleteAttribute : HttpMethodAttribute
{
    public HttpDeleteAttribute() : base(HttpMethod.Delete) { }
}
