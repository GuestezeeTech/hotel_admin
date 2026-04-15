import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductDetailsComponent } from './product-details.component';

const routes: Routes = [
    // { path: 'menu-detail', component: ProductDetailsComponent },
    // { path: 'menu-detail/:id', component: ProductDetailsComponent },
    // { path: 'menu-list/:id', component: ProductDetailsComponent },
    // { path: 'product-detail/:id', component: ProductDetailsComponent },
    // { path: 'product-detail', component: ProductDetailsComponent },
    // { path: 'add-menu', component: ProductDetailsComponent },
    // Newly added
    { path: 'product-list/:outlet_id', component: ProductDetailsComponent },
    { path: 'add-product', component: ProductDetailsComponent },
    { path: 'product-detail/:id', component: ProductDetailsComponent },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})

export class ProductDetailRoutingModule { }