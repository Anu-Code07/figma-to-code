import { registerGenerator } from '@figma-to-code/compiler-core';
import { FlutterGenerator } from '@figma-to-code/generator-flutter';
import { ReactGenerator } from '@figma-to-code/generator-react';
import { NextjsGenerator } from '@figma-to-code/generator-nextjs';
import { ReactNativeGenerator } from '@figma-to-code/generator-react-native';

export function registerAllGenerators(): void {
  registerGenerator('flutter', new FlutterGenerator());
  registerGenerator('react', new ReactGenerator());
  registerGenerator('nextjs', new NextjsGenerator());
  registerGenerator('react-native', new ReactNativeGenerator());
}
