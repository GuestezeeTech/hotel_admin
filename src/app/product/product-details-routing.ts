import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductDetailsComponent } from './product-details.component';

const routes: Routes = [
    { path: 'menu-detail', component: ProductDetailsComponent },
    { path: 'menu-detail/:id', component: ProductDetailsComponent },
    { path: 'menu-list/:id', component: ProductDetailsComponent },
    { path: 'product-detail/:id', component: ProductDetailsComponent },
    { path: 'product-detail', component: ProductDetailsComponent },
    { path: 'add-menu', component: ProductDetailsComponent },
     // Default route for this module
     
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})

export class ProductDetailRoutingModule { }