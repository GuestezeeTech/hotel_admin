export class Alert {
    // id: string;
    // type: AlertType;
    // message: string;
    // autoClose: boolean;
    // keepAfterRouteChange: boolean;
    // fade: boolean;
    id: string = ''; // Default empty string or any suitable default value
    type: AlertType = {} as AlertType; // Default value if AlertType is an object, or choose another sensible default
    message: string = '';
    autoClose: boolean = false;
    keepAfterRouteChange: boolean = false;
    fade: boolean = false;

    constructor(init?: Partial<Alert>) {
        Object.assign(this, init);
    }

    resetKeepAfterRouteChange() {
        this.keepAfterRouteChange = false;  // Reset to false
    }
}

export enum AlertType {
    Success,
    Error,
    Info,
    Warning
}
