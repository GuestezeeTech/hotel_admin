import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';
import { Alert, AlertType } from './alerts.model';
import { AlertsService } from './alerts.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-alerts',
    standalone: true, // ✅ Mark it as standalone
    imports: [CommonModule],
    templateUrl: './alerts.component.html',
    styleUrls: ['./alerts.component.scss']
})

export class AlertsComponent implements OnInit {
    @Input() id = 'default-alert';
    @Input() fade = true;
    alerts: Alert[] = [];
    alertSubscription: Subscription = new Subscription();;
    routeSubscription: Subscription = new Subscription();;

    constructor(private router: Router, private alertService: AlertsService) { }

    ngOnInit() {
        // subscribe to new alert notifications
        this.alertSubscription = this.alertService.onAlert(this.id)
            .subscribe(alert => {
                // clear alerts when an empty alert is received
                if (!alert.message) {
                    // filter out alerts without 'keepAfterRouteChange' flag
                    this.alerts = this.alerts.filter(x => x.keepAfterRouteChange);
                    // remove 'keepAfterRouteChange' flag on the rest
                    // this.alerts.forEach(x => delete x.keepAfterRouteChange );
                    this.alerts.forEach(x => x.resetKeepAfterRouteChange());
                    return;
                }
                // add alert to array
                this.alerts = [alert];
                // auto close alert if required
                if (alert.autoClose) {
                    setTimeout(() => this.removeAlert(alert), 6000);
                }
            });
        // clear alerts on location change
        this.routeSubscription = this.router.events.subscribe(event => {
            if (event instanceof NavigationStart) {
                this.alertService.clear();
            }
        });
    }

    ngOnDestroy() {
        // unsubscribe to avoid memory leaks
        this.alertSubscription.unsubscribe();
        this.routeSubscription.unsubscribe();
    }

    removeAlert(alert: Alert) {
        // check if already removed to prevent error on auto close
        if (!this.alerts.includes(alert)) return;
        // if (this.fade) {
        //     // fade out alert
        //     this.alerts.find(x => x === alert).fade = true;
        //     // remove alert after faded out
        //     setTimeout(() => {
        //         this.alerts = this.alerts.filter(x => x !== alert);
        //     }, 250);
        // } 
        const foundAlert = this.alerts.find(x => x === alert);
        if (foundAlert) {
            foundAlert.fade = true;
            // remove alert after faded out
            setTimeout(() => {
                this.alerts = this.alerts.filter(x => x !== alert);
            }, 250);
        }
        else {
            // remove alert
            this.alerts = this.alerts.filter(x => x !== alert);
        }
    }

    cssClass(alert: Alert) {
        if (!alert) return;
        const classes = ['alert', 'alert-dismissable'];
        const alertTypeClass = {
            [AlertType.Success]: 'alert alert-success',
            [AlertType.Error]: 'alert alert-danger',
            [AlertType.Info]: 'alert alert-info',
            [AlertType.Warning]: 'alert alert-warning'
        }
        classes.push(alertTypeClass[alert.type]);
        if (alert.fade) {
            classes.push('fade');
        }
        return classes.join(' ');
    }
}