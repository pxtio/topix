"""Singleton metaclass for creating singleton classes."""

import threading


class SingletonNotInitializedError(Exception):
    """Exception raised when trying to get an instance of a singleton class that is not initialized."""

    def __init__(self, message):
        """Initialize the exception with a message."""
        super().__init__(message)


class SingletonAlreadyInitializedError(Exception):
    """Exception raised when trying to initialize a singleton class that is already initialized."""

    def __init__(self, message):
        """Initialize the exception with a message."""
        super().__init__(message)


class SingletonMeta(type):
    """Metaclass to create a singleton class.

    Here is an example of how to use it:

    ```python
    from pydantic import BaseModel

    from src.utils.singleton import SingletonMeta

    # Define your normal base model class
    class NormalClass(BaseModel):
        value: int

    class NormalSingletonMeta(SingletonMeta, type(NormalClass)):
        pass

    # Define a singleton class that inherits from the normal class and uses
    # the SingletonMeta metaclass
    class SingletonClass(NormalClass, metaclass=NormalSingletonMeta):
        pass

    # this way you can test separately the logics inside your normal BaseModel class and
    # the singleton logic

    # Create an instance of the singleton class
    instance = SingletonClass(value=42)

    # Get the instance of the singleton class
    retrieved_instance = SingletonClass.get_instance()
    assert instance is retrieved_instance

    # Try to re-initialize the singleton class
    try:
        SingletonClass(value=43)
    except SingletonAlreadyInitializedError as e:
        print(e)

    """

    __instances = {}

    __lock = threading.Lock()

    def __call__(cls, *args, **kwargs):
        """Create a new instance of the singleton class if it is not initialized."""
        with cls.__lock:
            if cls not in cls.__instances:
                cls.__instances[cls] = super(SingletonMeta, cls).__call__(
                    *args,
                    **kwargs
                )
                return cls.__instances[cls]
            else:
                raise SingletonAlreadyInitializedError(
                    f"{cls.__name__} is already initialized. "
                    "As it is a singleton class, it can only be initialized once"
                )

    def __new__(cls, name, bases, class_dict):
        """Check if the singleton class is not subclassing another singleton class."""
        for base in bases:
            if isinstance(base, SingletonMeta):
                # Subclassing of a singleton class is forbidden
                raise TypeError(
                    f"Subclassing of {base.__name__} is forbidden as it is "
                    "a singleton class"
                )
        return super().__new__(cls, name, bases, class_dict)

    def instance(cls):
        """Get the instance of the singleton class if it is initialized, otherwise raise an exception.

        Arguments:
            cls: The singleton class

        Returns:
            The instance of the singleton class

        Raises:
            SingletonNotInitializedError: If the singleton class is not initialized

        """
        if cls not in cls.__instances:
            raise SingletonNotInitializedError(f"{cls.__name__} is not initialized")
        return cls.__instances[cls]

    def teardown(cls) -> bool:
        """Remove the instance of the singleton class if it is initialized."""
        with cls.__lock:
            if cls in cls.__instances:
                del cls.__instances[cls]
                return True
            return False
