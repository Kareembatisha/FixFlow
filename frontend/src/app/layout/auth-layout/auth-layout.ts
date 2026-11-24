import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Frame for the signed-out pages (login, register). */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class AuthLayout {}
