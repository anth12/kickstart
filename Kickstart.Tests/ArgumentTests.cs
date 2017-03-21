using System.Linq;
using FluentAssertions;
using Xunit;

namespace Kickstart.Tests
{
    public class ArgumentTests
    {
        [Fact]
        public void Can_parse_help_arguments()
        {
            var parameters = Arguments.Parse(new [] {"-help", "-f"}.ToList());
            parameters.Help.Should().BeTrue();
            parameters.Force.Should().BeTrue();
            parameters.Url.Should().BeNullOrEmpty();

            parameters = Arguments.Parse(new[] { "-f", "http://google.com" }.ToList());
            parameters.Help.Should().BeFalse();
            parameters.Force.Should().BeTrue();
            parameters.Url.Should().NotBeNullOrEmpty();

            parameters = Arguments.Parse(new[] { "http://google.com" }.ToList());
            parameters.Help.Should().BeFalse();
            parameters.Force.Should().BeFalse();
            parameters.Url.Should().NotBeNullOrEmpty();

            parameters = Arguments.Parse(new[] { "-f" }.ToList());
            parameters.Help.Should().BeFalse();
            parameters.Force.Should().BeTrue();
            parameters.Url.Should().BeNullOrEmpty();
        }
    }
}
