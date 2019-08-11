import {ControlValueAccessor, NG_VALUE_ACCESSOR, NgControl} from "@angular/forms";
import {
    ChangeDetectorRef, EventEmitter,
    forwardRef, HostBinding,
    Inject,
    Injectable,
    Injector,
    Input,
    OnDestroy, Output,
    SkipSelf,
    Type
} from "@angular/core";
import {getClassName} from "@marcj/estdlib";

export function ngValueAccessor<T>(clazz: Type<T>) {
    return {
        provide: NG_VALUE_ACCESSOR,
        useExisting: forwardRef(() => clazz),
        multi: true
    };
}

/**
 * If you sub class this class and have own constructor or property initialization you need
 * to provide the dependencies of this class manually.
 *
 *
    constructor(
        protected injector: Injector,
        protected cd: ChangeDetectorRef,
        @SkipSelf() protected cdParent: ChangeDetectorRef,
    ) {
        super(injector, cd, cdParent);
    }
 *
 */
@Injectable()
export class ValueAccessorBase<T> implements ControlValueAccessor, OnDestroy {
    /**
     * @hidden
     */
    private _innerValue: T | undefined;

    /**
     * @hidden
     */
    public readonly _changedCallback: ((value: T | undefined) => void)[] = [];

    /**
     * @hidden
     */
    public readonly _touchedCallback: (() => void)[] = [];

    private _ngControl?: NgControl;
    private _ngControlFetched = false;

    @Input() valid?: boolean;
    @HostBinding('class.valid')
    get isValid() {
        return this.valid === true;
    }

    @Input() error?: boolean;
    @HostBinding('class.error')
    get isError() {
        if (undefined === this.error && this.ngControl) {
            return (this.ngControl.dirty || this.ngControl.touched) && this.ngControl.invalid;
        }

        return this.error;
    }

    @Input()
    disabled?: boolean;

    @HostBinding('class.disabled')
    get isDisabled() {
        if (undefined === this.disabled && this.ngControl) {
            return this.ngControl.disabled;
        }

        return this.disabled === true;
    }

    @HostBinding('class.required')
    @Input()
    required: boolean = false;

    @Output()
    public readonly change = new EventEmitter<T>();

    constructor(
        @Inject(Injector) protected injector: Injector,
        @Inject(ChangeDetectorRef) protected cd: ChangeDetectorRef,
        @Inject(ChangeDetectorRef) @SkipSelf() protected cdParent: ChangeDetectorRef,
    ) {
    }

    get ngControl(): NgControl | undefined {
        if (!this._ngControlFetched) {
            try {
                this._ngControl = this.injector.get(NgControl);
            } catch (e) {
            }
            this._ngControlFetched = true;
        }

        return this._ngControl;
    }

    /**
     * @hidden
     */
    setDisabledState(isDisabled: boolean): void {
        this.disabled = isDisabled;
    }

    /**
     * @hidden
     */
    ngOnDestroy(): void {
    }

    /**
     * @hidden
     */
    get innerValue(): T | undefined {
        return this._innerValue;
    }

    /**
     * Sets the internal value and signals Angular's form and other users (that subscribed via registerOnChange())
     * that a change happened.
     *
     * @hidden
     */
    set innerValue(value: T | undefined) {
        if (this._innerValue !== value) {
            this._innerValue = value;
            for (const callback of this._changedCallback) {
                callback(value);
            }
            this.onInnerValueChange().then(() => {
                this.cd.markForCheck();
                this.cdParent.detectChanges();
            });
            this.change.emit(value);
        }
        this.cd.markForCheck();
        this.cdParent.detectChanges();
    }

    /**
     * Internal note: This method is called from outside. Either from Angular's form or other users.
     *
     * @hidden
     */
    async writeValue(value?: T) {
        if (this._innerValue !== value) {
            this._innerValue = value;
            await this.onInnerValueChange();

            this.cd.markForCheck();
            this.cdParent.detectChanges();
        }
    }

    /**
     * This method can be overwritten to get easily notified when writeValue() has been called.
     *
     * @hidden
     */
    protected async onInnerValueChange() {

    }

    /**
     * Call this method to signal Angular's form or other users that this widget has been touched.
     * @hidden
     */
    touch() {
        for (const callback of this._touchedCallback) {
            callback();
        }
    }

    /**
     * @hidden
     */
    registerOnChange(fn: (value: T | undefined) => void) {
        this._changedCallback.push(fn);
    }

    /**
     * @hidden
     */
    registerOnTouched(fn: () => void) {
        this._touchedCallback.push(fn);
    }
}
