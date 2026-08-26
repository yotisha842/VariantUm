package ru.variantum.exception;

public class StorageException extends RuntimeException {
    public StorageException(Throwable cause) { super("Файловое хранилище временно недоступно", cause); }
}
