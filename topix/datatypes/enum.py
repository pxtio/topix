"""Custom Enum class with enhanced functionality."""

from enum import Enum, EnumMeta


class CustomEnumMeta(EnumMeta):
    """Custom Enum metaclass to enhance functionality."""

    def __contains__(cls, value) -> bool:
        """Check if a value is in the enum."""
        return any(value in (item, item.value) for item in cls)


class CustomEnum(Enum, metaclass=CustomEnumMeta):
    """Custom Enum object."""

    def __str__(self) -> str:
        """Return the string representation of the enum value."""
        return str(self.value)

    def __repr__(self) -> str:
        """Return the string representation of the enum."""
        return str(self)

    def __eq__(self, other):
        """Check equality with another value."""
        if isinstance(other, (int, str, float, bool)):
            return self.value == other
        return super().__eq__(other)
