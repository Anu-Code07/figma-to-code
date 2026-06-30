import { registerGenerator } from '@design2code/compiler-core';
import { FlutterGenerator } from '@design2code/generator-flutter';
import { ReactGenerator } from '@design2code/generator-react';
import { NextjsGenerator } from '@design2code/generator-nextjs';
import { ReactNativeGenerator } from '@design2code/generator-react-native';

export function registerAllGenerators(): void {
  registerGenerator('flutter', new FlutterGenerator());
  registerGenerator('react', new ReactGenerator());
  registerGenerator('nextjs', new NextjsGenerator());
  registerGenerator('react-native', new ReactNativeGenerator());
}
