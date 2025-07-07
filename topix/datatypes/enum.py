from enum import Enum, EnumMeta


class CustomEnumMeta(EnumMeta):
    def __contains__(cls, value) -> bool:
        for item in cls:
            if value == item or value == item.value:
                return True
        return False


class CustomEnum(Enum, metaclass=CustomEnumMeta):
    """Custom Enum object"""
    def __str__(self) -> str:
        return str(self.value)

    def __repr__(self) -> str:
        return str(self)

    def __eq__(self, other):
        if isinstance(other, (int, str, float, bool)):
            return self.value == other
        return super().__eq__(other)
